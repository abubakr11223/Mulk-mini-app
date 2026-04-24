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

function extractCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null
  // ll=lng,lat or ?ll=
  const ll = url.match(/[?&]ll=([0-9.]+)%2C([0-9.]+)/) || url.match(/[?&]ll=([0-9.]+),([0-9.]+)/)
  if (ll) {
    const lng = parseFloat(ll[1]), lat = parseFloat(ll[2])
    if (lat >= 37 && lat <= 46 && lng >= 56 && lng <= 74) return { lat, lng }
  }
  // ?q=lat,lng
  const q = url.match(/[?&]q=([0-9.]+),([0-9.]+)/)
  if (q) {
    const a = parseFloat(q[1]), b = parseFloat(q[2])
    if (a >= 37 && a <= 46 && b >= 56 && b <= 74) return { lat: a, lng: b }
    if (b >= 37 && b <= 46 && a >= 56 && a <= 74) return { lat: b, lng: a }
  }
  return null
}

async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const r = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,uz;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })
    return r.url
  } catch { return null }
}

export async function GET() {
  try {
    // amo-leads cache dan short URL larni olish
    const cacheRes = await kvPipeline([['get', 'cache:amo-leads']])
    const houses: any[] = JSON.parse(cacheRes[0]?.result || '[]')

    const noCoords = houses.filter(h => (!h.lat || h.lat === 0) && h.yandex_url &&
      (h.yandex_url.includes('maps/-/') || h.yandex_url.includes('navi/-/')))

    let resolved = 0
    const updates: Record<string, {lat:number;lng:number}> = {}

    // Parallel: 5 ta birdan
    const batches = []
    for (let i = 0; i < Math.min(noCoords.length, 50); i += 5) {
      batches.push(noCoords.slice(i, i + 5))
    }

    for (const batch of batches) {
      await Promise.all(batch.map(async (h) => {
        const fullUrl = await resolveShortUrl(h.yandex_url)
        if (!fullUrl) return
        const coords = extractCoords(fullUrl)
        if (coords) {
          updates[String(h.id)] = coords
          resolved++
        }
      }))
    }

    if (Object.keys(updates).length > 0) {
      // coords ni Redis ga saqlash
      const cmds = Object.entries(updates).map(([id, c]) =>
        ['set', `coords:${id}`, JSON.stringify(c), 'EX', 60*60*24*365]
      )
      await kvPipeline(cmds)
      // Cache ni tozalaymiz
      await kvPipeline([['del', 'cache:amo-leads']])
    }

    return NextResponse.json({
      ok: true,
      total: noCoords.length,
      resolved,
      updates: Object.keys(updates).length,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
