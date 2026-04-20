import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 10

// ── Vercel KV (Upstash Redis REST API) ───────────────────────────────────────
const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) return null
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store',
    })
    const j = await r.json()
    return j.result ?? null
  } catch { return null }
}

async function kvSet(key: string, value: string, ex = 86400 * 30): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['set', key, value, 'EX', ex]]),
      cache: 'no-store',
    })
  } catch {}
}

// ── Photo helpers ─────────────────────────────────────────────────────────────
type PhotoEntry = { file_id: string; file_unique_id: string; date: string }

async function getPhotos(crmId: string): Promise<PhotoEntry[]> {
  const val = await kvGet(`photo:${crmId}`)
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

async function savePhotos(crmId: string, photos: PhotoEntry[]): Promise<void> {
  await kvSet(`photo:${crmId}`, JSON.stringify(photos))
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendMsg(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

// ── Main webhook ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update.message || update.channel_post
    if (!msg) return NextResponse.json({ ok: true })

    const chatId   = msg.chat?.id as number | undefined
    const photos   = msg.photo as any[] | undefined
    if (!photos || photos.length === 0) return NextResponse.json({ ok: true })

    // Admin tekshiruv
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const senderId = String(msg.from?.id || msg.chat?.id || '')
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    const caption = (msg.caption || '') as string
    const photo   = photos[photos.length - 1]
    const photoData: PhotoEntry = {
      file_id:        photo.file_id,
      file_unique_id: photo.file_unique_id,
      date: new Date((msg.date as number) * 1000).toISOString().split('T')[0],
    }

    const captionMatch = caption.match(/#?(\d{5,9})\b/)

    // ── CRM ID aniqlash ───────────────────────────────────────────────────────
    // 1. Caption dan
    // 2. Session dan (5 daqiqa avval yuborilgan ID)
    let crmId: string | null = captionMatch ? captionMatch[1] : null

    if (!crmId && senderId) {
      crmId = await kvGet(`session:${senderId}`)
    }

    if (!crmId) {
      if (chatId) await sendMsg(chatId,
        '❌ CRM ID topilmadi.\n\nBirinchi rasmga caption da ID yozing:\n<code>#38042635</code>\n\nKeyin 5 daqiqa ichida qolgan rasmlarni shunchaki yuboring.')
      return NextResponse.json({ ok: true })
    }

    // Session yangilash (har rasm yuborganda 5 daqiqa uzaytiradi)
    if (senderId) await kvSet(`session:${senderId}`, crmId, 300)

    // ── Rasmni saqlash ────────────────────────────────────────────────────────
    const existing  = await getPhotos(crmId)
    const isNew     = existing.length === 0
    const duplicate = existing.some(p => p.file_unique_id === photoData.file_unique_id)

    if (!duplicate) {
      existing.push(photoData)
      await savePhotos(crmId, existing)
    }

    const total = existing.length

    // Faqat birinchi (caption li) rasmda yoki har 5 ta rasmda xabar
    const isFirst = !!captionMatch
    if (isFirst || total % 5 === 0) {
      if (chatId) await sendMsg(chatId,
        `${isNew ? '✅' : '➕'} CRM <b>#${crmId}</b>\n` +
        `📸 ${total} ta rasm saqlandi` +
        (isFirst && !isNew ? '\n⚡ Session ochiq — 5 daqiqa ichida qolgan rasmlarni yuboring' : ''))
    }

    console.log(`Photo saved: CRM #${crmId} (${total} total), sender: ${senderId}`)
  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram photo webhook active',
    kv: KV_URL ? '✅ connected' : '❌ not configured',
  })
}
