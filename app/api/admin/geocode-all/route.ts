import { NextResponse } from 'next/server'

const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands), cache: 'no-store',
    })
    return await r.json()
  } catch { return [] }
}

async function geocode(query: string): Promise<{lat:number;lng:number} | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3&lang=ru`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'mulkinvest-miniapp/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json()
    for (const f of (data.features || [])) {
      const [lng, lat] = f.geometry?.coordinates || []
      if (lat >= 37 && lat <= 46 && lng >= 56 && lng <= 74) {
        return { lat, lng }
      }
    }
  } catch {}
  return null
}

const DISTRICT_MAP: Record<string, string> = {
  'юнусабад': 'Yunusobod', 'алмазар': 'Olmazor', 'чиланзар': 'Chilonzor',
  'мирабад': 'Mirobod', 'яккасарай': 'Yakkasaroy', 'сергели': 'Sergeli',
  'учтепа': 'Uchtepa', 'бектемир': 'Bektemir', 'мирзо-улугбек': 'Mirzo Ulugbek',
  'шайхантахур': 'Shayxontohur', 'яшнабад': 'Yashnobod', 'ускюдар': 'Uskudar',
  'зангиата': 'Zangiota', 'карасу': 'Qorasув',
}

function cleanTitle(title: string): string {
  return title
    .replace(/Facebook №\d+/gi, '')
    .replace(/^(в\s+ЖК|на\s+ул\.|в\s+жк|ЖК|жк)\s*/i, '')
    .replace(/['"«»""]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function districtEn(district: string): string {
  const lower = district.toLowerCase()
  for (const [ru, en] of Object.entries(DISTRICT_MAP)) {
    if (lower.includes(ru)) return en
  }
  return district
}

export async function GET() {
  try {
    const cacheRes = await kvPipeline([['get', 'cache:amo-leads']])
    const houses: any[] = JSON.parse(cacheRes[0]?.result || '[]')

    const noCoords = houses.filter(h => !h.lat || h.lat === 0)
    const results: Record<string, {lat:number;lng:number}> = {}
    let found = 0

    for (const h of noCoords.slice(0, 100)) {
      const name = cleanTitle(h.title || '')
      const district = h.district || ''
      const landmark = h.landmark || ''

      const districtEng = districtEn(district)
      const queries = [
        `${name} Tashkent ${districtEng}`,
        `${name} Toshkent`,
        landmark ? `${landmark} Tashkent` : '',
        `${districtEng} Tashkent`,
        `${districtEng} Toshkent`,
      ].filter(q => q.trim().length > 5).map(q => q.trim())

      for (const q of queries) {
        const coords = await geocode(q)
        if (coords) {
          results[String(h.id)] = coords
          found++
          break
        }
        await new Promise(r => setTimeout(r, 100))
      }
    }

    if (Object.keys(results).length > 0) {
      const cmds = Object.entries(results).map(([id, c]) =>
        ['set', `coords:${id}`, JSON.stringify(c), 'EX', 60*60*24*365]
      )
      await kvPipeline(cmds)
      await kvPipeline([['del', 'cache:amo-leads']])
    }

    return NextResponse.json({
      ok: true,
      total: noCoords.length,
      found,
      saved: Object.keys(results).length,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
