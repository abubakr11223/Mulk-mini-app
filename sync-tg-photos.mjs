/**
 * MULK INVEST — Photo Sync Script
 * ─────────────────────────────────
 * Ishlatish:
 *   1. Botga private chat orqali rasm yuboring (caption = CRM ID, masalan: 37691103)
 *   2. node sync-tg-photos.mjs
 *   3. git add public/photos_cache.json && git commit -m "photos" && git push
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// .env.local o'qish
const envPath = join(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8').trim().split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const TOKEN   = env.TELEGRAM_BOT_TOKEN
const ADMINS  = (env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN topilmadi .env.local da')
  process.exit(1)
}

const CACHE_PATH = join(process.cwd(), 'public', 'photos_cache.json')

function readCache() {
  try { return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) } catch { return {} }
}

async function tgApi(method, params = {}) {
  const url = new URL(`https://api.telegram.org/bot${TOKEN}/${method}`)
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)))
  const r = await fetch(url.toString())
  return r.json()
}

async function main() {
  console.log('\n📸 MULK INVEST — Photo Sync\n' + '─'.repeat(40))

  // Bot info
  const me = await tgApi('getMe')
  if (!me.ok) { console.error('❌ Bot token xato!'); process.exit(1) }
  console.log(`🤖 Bot: @${me.result.username}`)

  // Webhook vaqtincha o'chirish
  const wh = await tgApi('getWebhookInfo')
  const oldWh = wh.result?.url || ''
  if (oldWh) {
    await tgApi('deleteWebhook')
    console.log('⏸  Webhook vaqtincha o\'chirildi')
    await new Promise(r => setTimeout(r, 800))
  }

  const cache = readCache()
  const before = Object.keys(cache).length
  let found = 0
  let skip = 0
  let offset = 0

  console.log('\n📥 Botga yuborilgan rasmlar qidirilmoqda...\n')

  // getUpdates bilan barcha pending updatelarni olish
  while (true) {
    const res = await tgApi('getUpdates', { offset, limit: 100, timeout: 0 })
    if (!res.ok || !res.result?.length) break

    for (const upd of res.result) {
      const msg = upd.message

      if (msg?.photo) {
        const senderId = String(msg.from?.id || '')
        const caption  = (msg.caption || '').trim()

        // Admin tekshirish (ADMIN_IDS bo'sh bo'lsa hammaga ruxsat)
        if (ADMINS.length > 0 && !ADMINS.includes(senderId)) {
          console.log(`   ⛔ Admin emas (ID: ${senderId}) — o'tkazib yuborildi`)
          skip++
          offset = upd.update_id + 1
          continue
        }

        // CRM ID topish (5-9 raqam)
        const m = caption.match(/#?(\d{5,9})\b/)
        if (!m) {
          console.log(`   ⚠️  Caption da CRM ID yo'q: "${caption.slice(0,30)}"`)
          offset = upd.update_id + 1
          continue
        }

        const crmId = m[1]
        const photo = msg.photo[msg.photo.length - 1]

        cache[crmId] = {
          file_id: photo.file_id,
          file_unique_id: photo.file_unique_id,
          from: msg.from?.username || senderId,
          date: new Date(msg.date * 1000).toISOString().split('T')[0],
        }
        found++
        console.log(`   ✅ CRM #${crmId} — rasm saqlandi (${msg.from?.first_name || senderId})`)
      }

      offset = upd.update_id + 1
    }

    if (res.result.length < 100) break
  }

  // Webhookni qayta o'rnatish
  if (oldWh) {
    await tgApi('setWebhook', { url: oldWh })
    console.log('\n🔗 Webhook qayta tiklandi')
  }

  // Saqlash
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

  const after = Object.keys(cache).length
  console.log('\n' + '─'.repeat(40))
  console.log(`📊 Yangi rasmlar: ${found} ta`)
  console.log(`💼 Jami cache: ${after} ta (oldin: ${before} ta)`)
  if (skip) console.log(`⛔ Admin emas: ${skip} ta o'tkazildi`)

  if (found > 0) {
    console.log('\n🚀 Endi deploy qiling:')
    console.log('   git add public/photos_cache.json')
    console.log('   git commit -m "photos: ' + found + ' ta rasm qo\'shildi"')
    console.log('   git push')
  } else {
    console.log('\n💡 Rasm topilmadi. Quyidagicha yuboring:')
    console.log('   1. Botga (@sizning_bot) private chat oching')
    console.log('   2. Uy rasmini yuboring')
    console.log('   3. Caption da CRM ID yozing (masalan: 37691103)')
    console.log('   4. Keyin bu skriptni qayta ishlatib ko\'ring')
  }
}

main().catch(console.error)
