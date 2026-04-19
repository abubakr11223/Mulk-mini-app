// resolve-all-coords.mjs
// Barcha Yandex qisqa URLlarni hal qilib coords_cache.json ga yozadi
// Ishlatish: node resolve-all-coords.mjs

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── .env.local dan o'qish ──────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
  }
  return env
}

const env = loadEnv()
const SUBDOMAIN = env.AMOCRM_SUBDOMAIN
const TOKEN = env.AMOCRM_TOKEN
const PIPELINE_ID = 10775902
const FIELD_YANDEX_URL = 1461194

// ── HTTPS GET ──────────────────────────────────────────────────────────────
function httpsGet(host, urlPath, token) {
  return new Promise((resolve, reject) => {
    https.get(
      { hostname: host, path: urlPath, headers: { Authorization: 'Bearer ' + token } },
      (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)) }
    ).on('error', reject)
  })
}

// ── URL redirect hal qilish ────────────────────────────────────────────────
function isValidUrl(url) {
  try { new URL(url); return true } catch { return false }
}

function resolveRedirect(url, maxRedirects = 5) {
  if (!isValidUrl(url)) return Promise.resolve(url)
  return new Promise((resolve) => {
    if (maxRedirects === 0) { resolve(url); return }

    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept-Language': 'ru,uz,en',
      }
    }, (res) => {
      res.resume()
      const location = res.headers.location
      if (location && res.statusCode >= 300 && res.statusCode < 400) {
        const next = location.startsWith('http') ? location : new URL(location, url).href
        resolveRedirect(next, maxRedirects - 1).then(resolve)
      } else {
        resolve(url)
      }
    })
    req.on('error', () => resolve(url))
    req.setTimeout(8000, () => { req.destroy(); resolve(url) })
  })
}

// ── Koordinata ajratish ────────────────────────────────────────────────────
function isUzbekistan(lat, lng) {
  return lat >= 37 && lat <= 46 && lng >= 55 && lng <= 74
}

function extractCoords(url) {
  if (!url) return null

  // Google Maps: q=lat,lng
  const q = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/)
  if (q) {
    const [a, b] = [+q[1], +q[2]]
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
  }

  // Yandex: ll=lng,lat
  const ll = url.match(/[?&]ll=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (ll) {
    const [a, b] = [+ll[1], +ll[2]]
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  // Yandex: pt=lng,lat
  const pt = url.match(/[?&]pt=([0-9.]+)[,%2C]+([0-9.]+)/)
  if (pt) {
    const [a, b] = [+pt[1], +pt[2]]
    if (isUzbekistan(b, a)) return { lat: b, lng: a }
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  // @lat,lng (Google)
  const at = url.match(/@([0-9.-]+),([0-9.-]+)/)
  if (at) {
    const [a, b] = [+at[1], +at[2]]
    if (isUzbekistan(a, b)) return { lat: a, lng: b }
  }

  return null
}

// ── Parallel batch ────────────────────────────────────────────────────────
async function batchResolve(items, batchSize = 10) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const resolved = await Promise.all(batch.map(item => resolveRedirect(item.url)))
    batch.forEach((item, idx) => results.push({ ...item, resolved: resolved[idx] }))
    console.log(`  ${Math.min(i + batchSize, items.length)}/${items.length} hal qilindi`)
  }
  return results
}

// ── ASOSIY ────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡 amoCRM dan lidlar yuklanmoqda...')

  // Barcha lidlarni olish
  const allLeads = []
  let page = 1
  while (true) {
    const p = `/api/v4/leads?limit=250&page=${page}&filter%5Bpipeline_id%5D=${PIPELINE_ID}&with=custom_fields_values`
    const text = await httpsGet(SUBDOMAIN + '.amocrm.ru', p, TOKEN)
    let data
    try { data = JSON.parse(text) } catch { break }
    const leads = data?._embedded?.leads ?? []
    if (leads.length === 0) break
    allLeads.push(...leads)
    page++
    if (page > 20) break
  }
  console.log(`✅ ${allLeads.length} ta lid topildi`)

  // Mavjud cache ni o'qish
  const cachePath = path.join(__dirname, 'public', 'coords_cache.json')
  let cache = {}
  try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) } catch {}
  console.log(`📦 Mavjud cache: ${Object.keys(cache).length} ta koordinata`)

  // URL larni ajratish
  const toResolve = []
  for (const lead of allLeads) {
    const fields = lead.custom_fields_values || []
    const f = fields.find(f => f.field_id === FIELD_YANDEX_URL)
    const url = f?.values?.[0]?.value ?? ''
    if (!url) continue

    const directCoords = extractCoords(url)
    if (directCoords) {
      cache[String(lead.id)] = directCoords
    } else if (!cache[String(lead.id)]) {
      toResolve.push({ id: lead.id, url })
    }
  }

  console.log(`\n🔗 ${toResolve.length} ta Yandex qisqa URL hal qilinmoqda...`)

  if (toResolve.length > 0) {
    const resolved = await batchResolve(toResolve, 10)

    let found = 0
    for (const item of resolved) {
      const coords = extractCoords(item.resolved)
      if (coords) {
        cache[String(item.id)] = coords
        found++
      } else {
        console.log(`  ⚠️  Lid ${item.id}: koordinata topilmadi`)
        console.log(`     URL: ${item.url}`)
        console.log(`     Resolved: ${item.resolved}`)
      }
    }
    console.log(`✅ ${found}/${toResolve.length} ta yangi koordinata topildi`)
  }

  // Cache ni saqlash
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  console.log(`\n💾 ${Object.keys(cache).length} ta koordinata saqlandi → public/coords_cache.json`)
  console.log('\n✅ Tayyor! Endi: git add public/coords_cache.json && git commit -m "coords cache yangilandi" && git push')
}

main().catch(console.error)
