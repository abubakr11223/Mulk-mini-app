// resolve-yandex-playwright.mjs
// Playwright bilan real Chrome orqali Yandex short URLlarni hal qiladi
// Ishlatish: node resolve-yandex-playwright.mjs

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// .env.local dan o'qish
function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    try {
      const content = fs.readFileSync(path.join(__dirname, f), 'utf8')
      const env = {}
      for (const line of content.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
      }
      return env
    } catch {}
  }
  return {}
}

function extractCoords(url) {
  if (!url) return null
  const ll = url.match(/[?&]ll=([0-9.]+)[,%2C]+([0-9.]+)/i) ||
             url.match(/[?&]ll=([0-9.]+)%2C([0-9.]+)/i)
  if (ll) {
    const lng = parseFloat(ll[1]), lat = parseFloat(ll[2])
    if (lat >= 37 && lat <= 46 && lng >= 56 && lng <= 74) return { lat, lng }
  }
  const q = url.match(/[?&]q=([0-9.]+),([0-9.]+)/)
  if (q) {
    const a = parseFloat(q[1]), b = parseFloat(q[2])
    if (a >= 37 && a <= 46 && b >= 56 && b <= 74) return { lat: a, lng: b }
  }
  return null
}

function isShortUrl(url) {
  return url && (url.includes('maps/-/') || url.includes('navi/-/'))
}

async function main() {
  const env = loadEnv()
  const cacheFile = path.join(__dirname, 'public', 'coords_cache.json')
  let cache = {}
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) } catch {}

  // AmoCRM dan uylarni olish
  const subdomain = env.AMOCRM_SUBDOMAIN || ''
  const token = env.AMOCRM_TOKEN || ''
  if (!subdomain || !token) { console.error('AMOCRM credentials kerak'); process.exit(1) }

  console.log('📥 AmoCRM dan uylar yuklanmoqda...')

  let allLeads = []
  let page = 1
  while (true) {
    const r = await fetch(
      `https://${subdomain}.amocrm.ru/api/v4/leads?pipeline_id=10775902&limit=250&page=${page}&with=custom_fields`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!r.ok) break
    const data = await r.json()
    const leads = data._embedded?.leads || []
    if (!leads.length) break
    allLeads = [...allLeads, ...leads]
    if (leads.length < 250) break
    page++
  }

  const FIELD_YANDEX_URL = 1461194
  // Mini app API dan koordinatasiz uylarni olish (to'g'ridan)
  console.log('📡 Mini app API dan koordinatasiz uylar...')
  const toResolve = []
  try {
    const r = await fetch('https://joyme-clone-abubakr11223s-projects.vercel.app/api/amo-leads')
    const houses = await r.json()
    for (const h of houses) {
      if (h.lat && h.lat !== 0) continue
      const url = h.yandex_url || ''
      if (isShortUrl(url)) {
        toResolve.push({ id: String(h.id), title: h.title, shortUrl: url })
      }
    }
    console.log(`📋 Koordinatasiz short URL: ${toResolve.length} ta`)
  } catch(e) {
    console.error('API xato:', e.message)
  }

  console.log(`\n🔗 Hal qilish kerak: ${toResolve.length} ta short URL`)
  console.log(`📍 Allaqachon cache da: ${Object.keys(cache).length} ta\n`)

  if (toResolve.length === 0) {
    console.log('✅ Hamma narsam cache da!')
    process.exit(0)
  }

  // Playwright browser ochish
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'ru-RU',
  })

  let found = 0
  let failed = 0

  for (let i = 0; i < toResolve.length; i++) {
    const { id, title, shortUrl } = toResolve[i]

    process.stdout.write(`[${i+1}/${toResolve.length}] CRM #${id} — `)

    try {
      const pg = await context.newPage()
      await pg.goto(shortUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      // URL o'zgarishini kutamiz
      await pg.waitForTimeout(2000)
      const finalUrl = pg.url()
      await pg.close()

      const coords = extractCoords(finalUrl)
      if (coords) {
        cache[id] = coords
        found++
        console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
      } else if (finalUrl.includes('showcaptcha')) {
        failed++
        console.log(`🔒 Captcha (${shortUrl})`)
      } else {
        failed++
        console.log(`❌ URL: ${finalUrl.substring(0, 60)}`)
      }
    } catch (e) {
      failed++
      console.log(`❌ Xato: ${e.message.substring(0, 50)}`)
    }

    // Cache ni har 10 tadan saqlash
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
      console.log(`  💾 Cache saqlandi (${Object.keys(cache).length} ta)`)
    }
  }

  await browser.close()

  // Yakuniy saqlash
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
  console.log(`\n📊 Natija:`)
  console.log(`  ✅ Topildi: ${found} ta`)
  console.log(`  ❌ Topilmadi: ${failed} ta`)
  console.log(`  💾 Jami cache: ${Object.keys(cache).length} ta`)
  console.log(`\n✅ Tayyor! git add public/coords_cache.json && git commit -m "coords update" && git push`)
}

main().catch(console.error)
