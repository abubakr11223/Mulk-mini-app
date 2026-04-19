// ─────────────────────────────────────────────────────────────────────────────
// app/api/amo-leads/route.ts
// amoCRM'dan lidlarni olib, koordinatalarini to'g'ri ajratib qaytaradi
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import https from 'https'
import { clearCache, getCache, House, isFresh, setCache } from '@/lib/amo-cache'

// ── Pipeline va custom field ID'lari ──────────────────────────────────────────
const PIPELINE_ID = 10775902

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
}

// ── Yordamchi: custom field qiymati ──────────────────────────────────────────
function getField(fields: any[], id: number): string {
  const f = fields.find((f: any) => f.field_id === id)
  return f?.values?.[0]?.value ?? ''
}

// ── ASOSIY TUZATMA: Koordinatalarni URL'dan ajratish ─────────────────────────
//
//  Yandex Maps URL'da  ll=  parametri  LONGITUDE, LATITUDE  tartibida keladi!
//  (birinchi uzunlik, keyin kenglik — odatiy lat,lng tartibidan TESKARI)
//
//  Misol: https://yandex.ru/maps/?ll=69.2401%2C41.2995&z=17
//                                     ^^^^^^^^ ^^^^^^^^
//                                     lng=69   lat=41   ← to'g'ri tartib
//
function extractCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  // 1) Yandex: ll=longitude,latitude  (yoki %2C — URL-encoded vergul)
  const llMatch = url.match(/[?&]ll=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (llMatch) {
    const lng = +llMatch[1]   // birinchi = longitude ✓
    const lat = +llMatch[2]   // ikkinchi = latitude  ✓
    if (isUzbekistan(lat, lng)) return { lat, lng }
    // Ba'zan foydalanuvchilar teskari nusxalaydi — tekshirib ko'ramiz
    if (isUzbekistan(lng, lat)) return { lat: lng, lng: lat }
  }

  // 2) Yandex: pt=longitude,latitude  (pin/marker parametri)
  const ptMatch = url.match(/[?&]pt=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (ptMatch) {
    const lng = +ptMatch[1]
    const lat = +ptMatch[2]
    if (isUzbekistan(lat, lng)) return { lat, lng }
    if (isUzbekistan(lng, lat)) return { lat: lng, lng: lat }
  }

  // 3) Yandex: rtext= (yo'nalish rejimlari) — birinchi nuqta
  const rtextMatch = url.match(/rtext=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (rtextMatch) {
    const a = +rtextMatch[1], b = +rtextMatch[2]
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
  }

  // 4) Google Maps: @latitude,longitude
  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/)
  if (atMatch) {
    const lat = +atMatch[1], lng = +atMatch[2]
    if (isUzbekistan(lat, lng)) return { lat, lng }
  }

  // 5) Google Maps: q=latitude,longitude
  const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/)
  if (qMatch) {
    const lat = +qMatch[1], lng = +qMatch[2]
    if (isUzbekistan(lat, lng)) return { lat, lng }
  }

  return null
}

// O'zbekiston geografik chegaralari
function isUzbekistan(lat: number, lng: number): boolean {
  return lat >= 37.0 && lat <= 45.6 && lng >= 55.9 && lng <= 73.2
}

// ── HTTPS so'rovi (https moduli) ──────────────────────────────────────────────
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

// ── amoCRM'dan barcha lidlarni olish ─────────────────────────────────────────
async function fetchAllLeads(subdomain: string, token: string): Promise<any[]> {
  const all: any[] = []
  let page = 1

  while (page <= 20) {  // Xavfsizlik chegarasi: 250×20 = 5000 lid
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

// ── Lid → House (xato bo'lsa null qaytaradi) ─────────────────────────────────
function mapLead(lead: any): House | null {
  try {
    const fields = lead.custom_fields_values || []
    const url = getField(fields, FIELD_IDS.yandex_url)
    const coords = extractCoords(url)

    if (!coords) return null  // Koordinata yo'q — xaritaga qo'shib bo'lmaydi

    const rawPrice = lead.price ?? 0
    return {
      id: lead.id,
      title: lead.name || `Lid #${lead.id}`,
      lat: coords.lat,
      lng: coords.lng,
      price: rawPrice < 10_000 ? rawPrice * 1_000 : rawPrice,
      rooms: parseInt(getField(fields, FIELD_IDS.rooms)) || 0,
      area: parseFloat(getField(fields, FIELD_IDS.area)) || 0,
      floor: parseInt(getField(fields, FIELD_IDS.floor)) || 0,
      totalFloors: parseInt(getField(fields, FIELD_IDS.total_floors)) || 0,
      district: getField(fields, FIELD_IDS.district),
      description: getField(fields, FIELD_IDS.description),
      landmark: getField(fields, FIELD_IDS.landmark),
      jk: getField(fields, FIELD_IDS.jk),
      yandex_url: url,
      updatedAt: lead.updated_at ?? 0,
    }
  } catch (e) {
    console.error(`⚠️  Lid ${lead.id} parse xatosi:`, e)
    return null
  }
}

// ── GET /api/amo-leads ────────────────────────────────────────────────────────
export async function GET(req: Request) {
  // ?force=1 → cache'ni majburiy yangilash
  const forceRefresh = new URL(req.url).searchParams.get('force') === '1'

  if (!forceRefresh && isFresh()) {
    const cached = getCache()!
    return NextResponse.json(cached.data, {
      headers: {
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.floor((Date.now() - cached.ts) / 1000)) + 's',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')

  if (!subdomain || !token) {
    return NextResponse.json(
      { error: 'AMOCRM_SUBDOMAIN yoki AMOCRM_TOKEN .env da yo\'q' },
      { status: 500 },
    )
  }

  try {
    const allLeads = await fetchAllLeads(subdomain, token)

    const results: House[] = []
    let skipped = 0

    for (const lead of allLeads) {
      const house = mapLead(lead)
      if (house) results.push(house)
      else skipped++
    }

    setCache(results)

    console.log(
      `✅ amoCRM: ${allLeads.length} lid, ${results.length} xaritaga, ${skipped} o'tkazib yuborildi`,
    )

    return NextResponse.json(results, {
      headers: {
        'X-Cache': 'MISS',
        'X-Total-Leads': String(allLeads.length),
        'X-Mapped': String(results.length),
        'X-Skipped': String(skipped),
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (e: any) {
    console.error('amoCRM API xato:', e)

    // Eski cache bor bo'lsa — xato bo'lsa ham uni qaytaramiz
    const stale = getCache()
    if (stale) {
      return NextResponse.json(stale.data, {
        headers: { 'X-Cache': 'STALE', 'X-Error': e.message },
      })
    }

    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── DELETE /api/amo-leads → cache'ni tozalash ────────────────────────────────
export async function DELETE() {
  clearCache()
  return NextResponse.json({ ok: true, message: 'Cache tozalandi' })
}
