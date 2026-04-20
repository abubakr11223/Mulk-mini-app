import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 10 // Vercel Hobby plan max (sekund)

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

// Redis List: rasmlarni ro'yxatga qo'shish
async function kvListPush(key: string, value: string, ex = 300): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['rpush', key, value],
        ['expire', key, ex],
      ]),
      cache: 'no-store',
    })
  } catch {}
}

// Redis List: hamma elementlarni olish
async function kvListGetAll(key: string): Promise<string[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['lrange', key, 0, 99]]),
      cache: 'no-store',
    })
    const j = await r.json()
    return Array.isArray(j[0]?.result) ? j[0].result : []
  } catch { return [] }
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

    // Admin tekshiruv
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const senderId = String(msg.from?.id || '')
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    const caption = (msg.caption || '') as string
    const mgId   = msg.media_group_id as string | undefined
    const photo  = photos[photos.length - 1] // eng katta hajm
    const photoData: PhotoEntry = {
      file_id:        photo.file_id,
      file_unique_id: photo.file_unique_id,
      date: new Date((msg.date as number) * 1000).toISOString().split('T')[0],
    }

    const captionMatch = caption.match(/#?(\d{5,9})\b/)

    // ════════════════════════════════════════════════════════════════════════
    // MEDIA GROUP (albom): har bir rasm ro'yxatga qo'shiladi
    // Caption li rasm 3 sek kutib, hammani birlashtiradi
    // ════════════════════════════════════════════════════════════════════════
    if (mgId) {
      // Har qanday rasm (caption li yoki yo'q) ro'yxatga qo'shiladi
      await kvListPush(`mglist:${mgId}`, JSON.stringify(photoData), 300)

      if (captionMatch) {
        const crmId = captionMatch[1]
        await kvSet(`mgcrmid:${mgId}`, crmId, 300)

        // Qolgan rasmlar kelishini kutamiz (Telegram ~1-2 sek ichida yuboradi)
        await new Promise(r => setTimeout(r, 2500))

        // Ro'yxatdan hamma rasmlarni olish
        const allRaw = await kvListGetAll(`mglist:${mgId}`)
        const groupPhotos: PhotoEntry[] = []
        for (const s of allRaw) {
          try {
            const p: PhotoEntry = JSON.parse(s)
            if (!groupPhotos.some(e => e.file_unique_id === p.file_unique_id)) {
              groupPhotos.push(p)
            }
          } catch {}
        }

        // Mavjud rasmlar bilan birlashtirish
        const existing = await getPhotos(crmId)
        const merged = [...existing]
        for (const p of groupPhotos) {
          if (!merged.some(e => e.file_unique_id === p.file_unique_id)) {
            merged.push(p)
          }
        }

        await savePhotos(crmId, merged)

        if (chatId) {
          await sendMsg(chatId,
            `✅ CRM <b>#${crmId}</b>\n📸 ${merged.length} ta rasm saqlandi`)
        }
        console.log(`Album saved: CRM #${crmId}, ${merged.length} photos`)
      }
      // Caption siz rasmlar — faqat ro'yxatga qo'shildi, tamom
      return NextResponse.json({ ok: true })
    }

    // ════════════════════════════════════════════════════════════════════════
    // YAKKA RASM
    // ════════════════════════════════════════════════════════════════════════
    if (!captionMatch) {
      if (chatId) await sendMsg(chatId,
        '❌ CRM ID topilmadi.\n\nCaption da ID yozing:\n<code>#38042635</code>')
      return NextResponse.json({ ok: true })
    }

    const crmId   = captionMatch[1]
    const existing = await getPhotos(crmId)
    const isNew    = existing.length === 0

    if (!existing.some(p => p.file_unique_id === photoData.file_unique_id)) {
      existing.push(photoData)
      await savePhotos(crmId, existing)
    }

    if (chatId) {
      await sendMsg(chatId,
        `${isNew ? '✅' : '➕'} CRM <b>#${crmId}</b>\n📸 ${existing.length} ta rasm saqlandi`)
    }
    console.log(`Single photo: CRM #${crmId}, ${existing.length} total`)
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
