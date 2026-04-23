// ─────────────────────────────────────────────────────────────────────────────
// app/api/amo-leads/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { clearCache, getCache, House, isFresh, setCache } from '../../../lib/amo-cache'

// coords_cache.json dan koordinatalar (deploy vaqtida o'qiladi)
let fileCache: Record<string, { lat: number; lng: number }> = {}
try {
  const p = path.join(process.cwd(), 'public', 'coords_cache.json')
  fileCache = JSON.parse(fs.readFileSync(p, 'utf8'))
  console.log(`📦 coords_cache.json: ${Object.keys(fileCache).length} ta koordinata`)
} catch { }

const PIPELINE_ID = 10775902
const TOP_STATUS_ID = 85232970   // "ТОП ЛУЧШИЕ (APP)"

const FIELD_IDS: Record<string, number> = {
  yandex_url: 1461194,
  rooms: 1460828,
  area: 1460576,
  floor: 1460716,
  total_floors: 1460802,
  district: 1461426,
  description: 1286101,
  landmark: 1573071,
  jk: 1286105,
  // Skidka uchun eski narx maydoni — amoCRM'dan field_id ni aniqlang va qo'ying:
  old_price: 0,   // ← TODO: to'g'ri field_id kiriting
}

// Qisqa URL → to'liq URL xotirasi (server hayoti davomida)
const resolvedUrlCache: Record<string, string> = {}

// ── Yordamchi ────────────────────────────────────────────────────────────────
function getField(fields: any[], id: number): string {
  const f = fields.find((f: any) => f.field_id === id)
  return f?.values?.[0]?.value ?? ''
}

function isUzbekistan(lat: number, lng: number): boolean {
  return lat >= 37.0 && lat <= 45.6 && lng >= 55.9 && lng <= 73.2
}

// ── Koordinata ajratish ───────────────────────────────────────────────────────
function extractCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  // Google Maps: q=lat,lng  yoki  ll=lat,lng
  const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/)
  if (qMatch) {
    const a = +qMatch[1], b = +qMatch[2]
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
  }

  // Google Maps: @lat,lng
  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/)
  if (atMatch) {
    const a = +atMatch[1], b = +atMatch[2]
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  // Yandex: ll=lng,lat (Yandex da birinchi longitude!)
  const llMatch = url.match(/[?&]ll=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (llMatch) {
    const a = +llMatch[1], b = +llMatch[2]
    // Yandex: ll=lng,lat
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
    // Ba'zan teskari
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  // Yandex: pt=lng,lat
  const ptMatch = url.match(/[?&]pt=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (ptMatch) {
    const a = +ptMatch[1], b = +ptMatch[2]
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  return null
}

// ── Yandex qisqa URL ni redirect orqali hal qilish ───────────────────────────
function resolveRedirect(url: string): Promise<string> {
  if (resolvedUrlCache[url]) return Promise.resolve(resolvedUrlCache[url])

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(url), 4000) // 4 soniya limit

    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept-Language': 'ru,uz',
        },
      },
      (res) => {
        clearTimeout(timeout)
        const location = res.headers.location as string | undefined
        res.resume()

        if (location && res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          // Relative URL ni absolute ga o'tkazish
          const resolved = location.startsWith('http') ? location : new URL(location, url).href
          resolvedUrlCache[url] = resolved
          resolve(resolved)
        } else {
          resolvedUrlCache[url] = url
          resolve(url)
        }
      },
    )

    req.on('error', () => { clearTimeout(timeout); resolve(url) })
    req.setTimeout(4000, () => { req.destroy(); resolve(url) })
  })
}

// Yandex qisqa URL ekanligini tekshirish
function isYandexShortUrl(url: string): boolean {
  return /yandex\.[a-z]+\/maps\/-\/[A-Za-z0-9_-]+/.test(url)
}

// ── HTTPS so'rovi ─────────────────────────────────────────────────────────────
function httpsGet(host: string, path: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get({ hostname: host, path, headers: { Authorization: 'Bearer ' + token } }, (r) => {
        let d = ''
        r.on('data', (c) => (d += c))
        r.on('end', () => resolve(d))
      })
      .on('error', reject)
  })
}

// ── amoCRM barcha lidlar ──────────────────────────────────────────────────────
async function fetchAllLeads(subdomain: string, token: string): Promise<any[]> {
  const all: any[] = []
  let page = 1
  while (page <= 20) {
    const path =
      `/api/v4/leads?limit=250&page=${page}` +
      `&filter%5Bpipeline_id%5D=${PIPELINE_ID}` +
      `&with=custom_fields_values`
    const text = await httpsGet(subdomain + '.amocrm.ru', path, token)
    let data: any
    try { data = JSON.parse(text) } catch { break }
    const leads: any[] = data?._embedded?.leads ?? []
    if (leads.length === 0) break
    all.push(...leads)
    page++
  }
  return all
}

// ── Parallel batch URL resolve ────────────────────────────────────────────────
async function resolveUrlsBatch(urls: string[], batchSize = 15): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const resolved = await Promise.all(batch.map(u => resolveRedirect(u)))
    batch.forEach((u, idx) => { result[u] = resolved[idx] })
  }
  return result
}

// ── Redis KV cache (serverless instancelar orasida umumiy) ───────────────────
const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''
const KV_KEY   = 'cache:amo-leads'
const KV_TTL   = 300  // 5 daqiqa

async function kvGetLeads(): Promise<House[] | null> {
  if (!KV_URL || !KV_TOKEN) return null
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(KV_KEY)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }, cache: 'no-store',
    })
    const j = await r.json()
    if (!j.result) return null
    return JSON.parse(j.result)
  } catch { return null }
}

async function kvSetLeads(data: House[]): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['set', KV_KEY, JSON.stringify(data), 'EX', KV_TTL]]),
      cache: 'no-store',
    })
  } catch {}
}

// ── GET /api/amo-leads ────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.get('force') === '1'

  // 1. In-memory cache (eng tez)
  if (!forceRefresh && isFresh()) {
    const cached = getCache()!
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'MEMORY', 'X-Count': String(cached.data.length) },
    })
  }

  // 2. Redis cache (serverless cold-start uchun)
  if (!forceRefresh) {
    const kvData = await kvGetLeads()
    if (kvData && kvData.length > 0) {
      setCache(kvData)
      return NextResponse.json(kvData, {
        headers: { 'X-Cache': 'REDIS', 'X-Count': String(kvData.length) },
      })
    }
  }

  const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')

  if (!subdomain || !token) {
    return NextResponse.json({ error: "AMOCRM_SUBDOMAIN yoki AMOCRM_TOKEN .env da yo'q" }, { status: 500 })
  }

  try {
    const allLeads = await fetchAllLeads(subdomain, token)

    // 1. Barcha Yandex qisqa URLlarni topish
    const shortUrls: string[] = []
    for (const lead of allLeads) {
      const fields = lead.custom_fields_values || []
      const url = getField(fields, FIELD_IDS.yandex_url)
      if (url && isYandexShortUrl(url) && !resolvedUrlCache[url]) {
        shortUrls.push(url)
      }
    }

    // 2. Redirect orqali to'liq URL olish (parallel, batch 15 ta)
    if (shortUrls.length > 0) {
      console.log(`🔗 ${shortUrls.length} ta Yandex qisqa URL hal qilinmoqda...`)
      await resolveUrlsBatch([...new Set(shortUrls)], 15)
      console.log(`✅ URL resolve tugadi`)
    }

    // 3. Lidlarni House ga o'tkazish
    const results: House[] = []
    let skipped = 0

    for (const lead of allLeads) {
      try {
        const fields = lead.custom_fields_values || []
        let url = getField(fields, FIELD_IDS.yandex_url)

        // Qisqa URL bo'lsa — resolve qilingan versiyasini olamiz
        if (url && isYandexShortUrl(url) && resolvedUrlCache[url]) {
          url = resolvedUrlCache[url]
        }

        // Koordinata olish: 1) URL dan, 2) xotira cachidan, 3) fayl cachidan
        let coords = extractCoords(url)
        if (!coords) coords = resolvedUrlCache[url] ? extractCoords(resolvedUrlCache[url]) : null
        if (!coords) coords = fileCache[String(lead.id)] ?? null
        if (!coords) { coords = { lat: 0, lng: 0 } }

        const rawPrice = lead.price ?? 0
        const rawOldPrice = FIELD_IDS.old_price
          ? parseFloat(getField(fields, FIELD_IDS.old_price)) || 0
          : 0

        results.push({
          id: lead.id,
          title: lead.name || `Lid #${lead.id}`,
          lat: coords.lat,
          lng: coords.lng,
          price: rawPrice < 10_000 ? rawPrice * 1_000 : rawPrice,
          oldPrice: rawOldPrice < 10_000 && rawOldPrice > 0 ? rawOldPrice * 1_000 : rawOldPrice,
          rooms: parseInt(getField(fields, FIELD_IDS.rooms)) || 0,
          area: parseFloat(getField(fields, FIELD_IDS.area)) || 0,
          floor: parseInt(getField(fields, FIELD_IDS.floor)) || 0,
          totalFloors: parseInt(getField(fields, FIELD_IDS.total_floors)) || 0,
          district: getField(fields, FIELD_IDS.district),
          description: getField(fields, FIELD_IDS.description),
          landmark: getField(fields, FIELD_IDS.landmark),
          jk: getField(fields, FIELD_IDS.jk),
          yandex_url: getField(fields, FIELD_IDS.yandex_url),
          updatedAt: lead.updated_at ?? 0,
          isTop: lead.status_id === TOP_STATUS_ID,
        })
      } catch (e) {
        console.error(`Lid ${lead.id} xato:`, e)
        skipped++
      }
    }

    setCache(results)
    kvSetLeads(results).catch(() => {}) // Redis ga ham saqlaydi
    console.log(`📍 ${results.length}/${allLeads.length} xaritaga tushdi, ${skipped} o'tkazib yuborildi`)

    return NextResponse.json(results, {
      headers: {
        'X-Cache': 'MISS',
        'X-Total': String(allLeads.length),
        'X-Mapped': String(results.length),
        'X-Skipped': String(skipped),
      },
    })
  } catch (e: any) {
    const stale = getCache()
    if (stale) return NextResponse.json(stale.data, { headers: { 'X-Cache': 'STALE' } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE() {
  clearCache()
  return NextResponse.json({ ok: true })
}
