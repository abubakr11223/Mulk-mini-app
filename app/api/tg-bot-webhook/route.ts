import { NextRequest, NextResponse } from 'next/server'

// ── Vercel KV (Upstash Redis REST API) ───────────────────────────────────────
// Vercel dashboard → Storage → KV yaratgandan keyin env vars avtomatik keladi
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

async function kvSet(key: string, value: string, exSeconds = 86400 * 30): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['set', key, value, 'EX', exSeconds]]),
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

    const chatId = msg.chat?.id as number | undefined
    const photos = msg.photo as any[] | undefined
    if (!photos || photos.length === 0) return NextResponse.json({ ok: true })

    // Admin check
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const senderId = String(msg.from?.id || '')
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    const caption = (msg.caption || '') as string
    const mgId    = msg.media_group_id as string | undefined

    // ── CRM ID aniqlash ───────────────────────────────────────────────────────
    let crmId: string | null = null
    const captionMatch = caption.match(/#?(\d{5,9})\b/)

    if (captionMatch) {
      crmId = captionMatch[1]
      // Media group bo'lsa, ID ni KV'da 2 daqiqa saqlaymiz (qolgan rasmlar uchun)
      if (mgId) await kvSet(`mg:${mgId}`, crmId, 120)
    } else if (mgId) {
      // Birinchi rasmdan keyin kelgan rasmlar — KV'dan ID olamiz
      // Retry: birinchi rasm KV'ga yozilishiga vaqt berish (race condition)
      crmId = await kvGet(`mg:${mgId}`)
      if (!crmId) {
        await new Promise(r => setTimeout(r, 800))
        crmId = await kvGet(`mg:${mgId}`)
      }
      if (!crmId) {
        await new Promise(r => setTimeout(r, 1200))
        crmId = await kvGet(`mg:${mgId}`)
      }
    }

    if (!crmId) {
      // Faqat yakka rasm bo'lsa xabar yuboramiz (media group bo'lsa jim)
      if (!mgId && chatId) {
        await sendMsg(chatId,
          '❌ CRM ID topilmadi.\n\nCaption da ID yozing:\n<code>#38042635</code>')
      }
      return NextResponse.json({ ok: true })
    }

    // ── Rasmni saqlash ────────────────────────────────────────────────────────
    const photo = photos[photos.length - 1] // eng katta hajm

    const photosList = await getPhotos(crmId)
    const isNew = photosList.length === 0
    const alreadyExists = photosList.some(p => p.file_unique_id === photo.file_unique_id)

    if (!alreadyExists) {
      photosList.push({
        file_id:       photo.file_id,
        file_unique_id: photo.file_unique_id,
        date: new Date((msg.date as number) * 1000).toISOString().split('T')[0],
      })
      await savePhotos(crmId, photosList)
    }

    // Faqat birinchi (caption li) rasm uchun tasdiqlash
    const isFirst = !!captionMatch
    if (isFirst && chatId) {
      const totalSoFar = photosList.length
      await sendMsg(chatId,
        `${isNew ? '✅' : '➕'} CRM <b>#${crmId}</b>\n` +
        `📸 ${totalSoFar} ta rasm saqlandi` +
        (mgId ? ' (albom davom etmoqda...)' : ''))
    }

    console.log(`Photo saved: CRM #${crmId}, total ${photosList.length}`)
  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram photo webhook active',
    kv: KV_URL ? '✅ connected' : '❌ not configured (KV_REST_API_URL missing)',
  })
}
