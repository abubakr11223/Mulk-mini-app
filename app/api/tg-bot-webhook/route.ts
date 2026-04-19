import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const CACHE = join(process.cwd(), 'public', 'photos_cache.json')

function readCache(): Record<string, any> {
  try { return JSON.parse(readFileSync(CACHE, 'utf-8')) } catch { return {} }
}
function saveCache(c: Record<string, any>) {
  writeFileSync(CACHE, JSON.stringify(c, null, 2))
}

async function sendMsg(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update.message || update.channel_post
    if (!msg) return NextResponse.json({ ok: true })

    const chatId = msg.chat?.id
    const photos = msg.photo

    if (!photos || photos.length === 0) return NextResponse.json({ ok: true })

    const caption = msg.caption || ''

    const match = caption.match(/#?(\d{5,9})\b/)
    if (!match) {
      if (chatId) await sendMsg(chatId,
        '❌ CRM ID topilmadi.\n\nCaption da ID yozing:\n<code>#37691103</code>')
      return NextResponse.json({ ok: true })
    }

    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const senderId = String(msg.from?.id || '')
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    const crmId = match[1]
    const photo = photos[photos.length - 1]

    const cache = readCache()
    const isNew = !cache[crmId]
    cache[crmId] = {
      file_id: photo.file_id,
      file_unique_id: photo.file_unique_id,
      date: new Date(msg.date * 1000).toISOString().split('T')[0],
    }
    saveCache(cache)

    const total = Object.keys(cache).length
    if (chatId) {
      await sendMsg(chatId,
        `${isNew ? '✅' : '🔄'} CRM <b>#${crmId}</b> — rasm ${isNew ? 'saqlandi' : 'yangilandi'}\n` +
        `📦 Jami: ${total} ta uy rasmi`)
    }

    console.log(`Photo saved: CRM #${crmId} (total: ${total})`)
  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const cache = readCache()
  return NextResponse.json({
    status: 'Telegram photo webhook active',
    photos_count: Object.keys(cache).length
  })
}
