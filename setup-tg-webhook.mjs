// Telegram webhook ni o'rnatish uchun script
// Ishlatish: node setup-tg-webhook.mjs https://your-app.vercel.app

import { readFileSync } from 'fs'
import { join } from 'path'

// .env.local o'qish
const envFile = join(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envFile, 'utf-8').trim().split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const token = env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN topilmadi .env.local da')
  process.exit(1)
}

const appUrl = process.argv[2] || 'https://joyme-clone.vercel.app'
const webhookUrl = `${appUrl}/api/tg-bot-webhook`

console.log('🔗 Webhook URL:', webhookUrl)

// Mavjud webhook ni tekshirish
const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
const info = await infoRes.json()
console.log('📌 Hozirgi webhook:', info.result?.url || 'yo\'q')

// Yangi webhook o\'rnatish
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'channel_post'] }),
})
const data = await res.json()
if (data.ok) {
  console.log('✅ Webhook muvaffaqiyatli o\'rnatildi!')
  console.log('   Endi groupda rasm + CRM ID (masalan: 37691103) yuboring')
} else {
  console.error('❌ Xato:', data.description)
}
