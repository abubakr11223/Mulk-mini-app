import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CACHE = join(process.cwd(), 'public', 'photos_cache.json')

function readCache(): Record<string, any> {
  try { return JSON.parse(readFileSync(CACHE, 'utf-8')) } catch { return {} }
}
function saveCache(c: Record<string, any>) {
  try { writeFileSync(CACHE, JSON.stringify(c, null, 2)) } catch {}
}

// Media group ID → CRM ID saqlash uchun /tmp ishlatamiz
function getMgCrmId(mgId: string): string | null {
  try {
    const p = `/tmp/mg_${mgId}`
    if (!existsSync(p)) return null
    const data = JSON.parse(readFileSync(p, 'utf-8'))
    if (Date.now() - data.ts > 60000) return null // 1 daqiqa
    return data.crmId
  } catch { return null }
}
function setMgCrmId(mgId: string, crmId: string) {
  try { writeFileSync(`/tmp/mg_${mgId}`, JSON.stringify({ crmId, ts: Date.now() })) } catch {}
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

function addPhotoToCache(cache: Record<string,any>, crmId: string, photo: any) {
  const entry = cache[crmId]
  let photos: any[] = []
  if (Array.isArray(entry?.photos)) photos = entry.photos
  else if (entry?.file_id) photos = [{ file_id: entry.file_id, file_unique_id: entry.file_unique_id }]

  const exists = photos.some(p => p.file_unique_id === photo.file_unique_id)
  if (!exists) photos.push({
    file_id: photo.file_id,
    file_unique_id: photo.file_unique_id,
    date: new Date().toISOString().split('T')[0],
  })
  cache[crmId] = { photos }
  return photos.length
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
    const mgId = msg.media_group_id ? String(msg.media_group_id) : null
    let crmId: string | null = null

    // CRM ID ni captiondan yoki /tmp dan olish
    const match = caption.match(/#?(\d{5,9})\b/)
    if (match) {
      crmId = match[1]
      if (mgId && crmId) setMgCrmId(mgId, crmId) // keyingi rasmlar uchun saqlash
    } else if (mgId) {
      crmId = getMgCrmId(mgId) // birinchi rasmdagi CRM ID ni olish
    }

    if (!crmId) {
      if (!mgId) {
        if (chatId) await sendMsg(chatId, '❌ CRM ID topilmadi.\n\nCaption da ID yozing:\n<code>#37700945</code>')
      }
      return NextResponse.json({ ok: true })
    }

    // Admin tekshirish
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const senderId = String(msg.from?.id || '')
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId && match) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    const photo = photos[photos.length - 1]
    const cache = readCache()
    const isNew = !cache[crmId]
    const total = addPhotoToCache(cache, crmId, photo)
    saveCache(cache)

    // Faqat caption bor xabarda javob berish (birinchi rasm)
    if (match && chatId) {
      await sendMsg(chatId,
        `${isNew ? '✅' : '➕'} CRM <b>#${crmId}</b>\n📸 Jami: ${total} ta rasm saqlandi`)
    }

  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const cache = readCache()
  return NextResponse.json({ status: 'ok', properties: Object.keys(cache).length })
}
