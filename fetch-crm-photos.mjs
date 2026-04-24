// fetch-crm-photos.mjs
// CRM chat/notesdan OLX rasm URLlarini tortadi va Redis ga saqlaydi
// Ishlatish: node fetch-crm-photos.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

const env = loadEnv()
const SUBDOMAIN = env.AMOCRM_SUBDOMAIN || 'mulkinvest'
const TOKEN = env.AMOCRM_TOKEN || ''
const KV_URL = (env.KV_REST_API_URL || '').replace(/\/$/, '')
const KV_TOKEN = env.KV_REST_API_TOKEN || ''
const PIPELINE_ID = 10775902

async function amoGet(path_) {
  const r = await fetch(`https://${SUBDOMAIN}.amocrm.ru${path_}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  return r.json()
}

async function kvPipeline(commands) {
  const r = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands), cache: 'no-store',
  })
  return r.json()
}

// Matndan rasm URLlarini topish
function extractImageUrls(text) {
  if (!text) return []
  const urls = []
  // OLX CDN linklar
  const olxRegex = /https:\/\/[a-z.]+\.olxcdn\.com\/[^\s"<>]+/gi
  const olxMatches = text.match(olxRegex) || []
  urls.push(...olxMatches)

  // Boshqa rasm linklar (jpg, jpeg, png, webp)
  const imgRegex = /https?:\/\/[^\s"<>]+\.(jpg|jpeg|png|webp|JPG|JPEG|PNG)(\?[^\s"<>]*)?/gi
  const imgMatches = text.match(imgRegex) || []
  urls.push(...imgMatches)

  // Dublikatlarni olib tashlab, tozalaymiz
  return [...new Set(urls)].filter(u => !u.includes('favicon'))
}

async function main() {
  if (!TOKEN) { console.error('Token kerak'); process.exit(1) }

  console.log('📥 CRM lidlar yuklanmoqda...')

  // 1. Barcha lidlarni olish
  let allLeads = []
  let page = 1
  while (page <= 20) {
    const data = await amoGet(
      `/api/v4/leads?limit=250&page=${page}&filter%5Bpipeline_id%5D=${PIPELINE_ID}`
    )
    const leads = data?._embedded?.leads || []
    if (!leads.length) break
    allLeads = [...allLeads, ...leads]
    page++
  }
  console.log(`📋 ${allLeads.length} ta lid topildi`)

  let processed = 0
  let found = 0
  const results = {}

  for (const lead of allLeads) {
    const crmId = String(lead.id)

    // 2. Har bir lid uchun noteslarni olish
    try {
      const notesData = await amoGet(
        `/api/v4/leads/${lead.id}/notes?limit=50&order%5Bid%5D=desc`
      )
      const notes = notesData?._embedded?.notes || []

      const allUrls = []
      for (const note of notes) {
        const text = note.params?.text || note.params?.note_type || ''
        const urls = extractImageUrls(text)
        allUrls.push(...urls)
      }

      if (allUrls.length > 0) {
        results[crmId] = [...new Set(allUrls)]
        found++
        console.log(`  ✅ CRM #${crmId}: ${results[crmId].length} ta rasm URL`)
      }
    } catch (e) {
      // skip
    }

    processed++
    if (processed % 50 === 0) console.log(`  ... ${processed}/${allLeads.length}`)

    // Rate limit
    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\n📊 ${found} ta lidda rasm URL topildi`)

  // 3. Redis ga saqlash
  if (Object.keys(results).length > 0) {
    console.log('💾 Redis ga saqlanmoqda...')
    const cmds = Object.entries(results).map(([id, urls]) => [
      'set', `photo_urls:${id}`, JSON.stringify(urls), 'EX', 60*60*24*365
    ])

    // Batch 50 ta
    for (let i = 0; i < cmds.length; i += 50) {
      await kvPipeline(cmds.slice(i, i + 50))
    }

    // Cache tozalash
    await kvPipeline([['del', 'cache:amo-leads']])
    console.log(`✅ ${Object.keys(results).length} ta lid rasmlari saqlandi!`)
  } else {
    console.log('❌ Hech qanday rasm URL topilmadi')
  }
}

main().catch(console.error)
