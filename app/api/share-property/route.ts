import { NextRequest, NextResponse } from 'next/server'

// ── KV ────────────────────────────────────────────────────────────────────────
const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
    })
    return await r.json()
  } catch { return [] }
}

type PhotoEntry = { file_id: string; file_unique_id: string }

async function getPhotos(crmId: string): Promise<PhotoEntry[]> {
  // 1. Yangi format: Redis LIST
  const listRes = await kvPipeline([['lrange', `photolist:${crmId}`, 0, -1]])
  const list: string[] = listRes[0]?.result ?? []
  if (list.length > 0) {
    return list.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean) as PhotoEntry[]
  }
  // 2. Eski format: JSON array string
  const getRes = await kvPipeline([['get', `photo:${crmId}`]])
  const val: string | null = getRes[0]?.result ?? null
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

// ── POST /api/share-property ──────────────────────────────────────────────────
function parseInitData(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (!userStr) return null
    const user = JSON.parse(decodeURIComponent(userStr))
    return user.id ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: rawUserId, initData, crmId, title, price, rooms, area, floor, totalFloors,
            district, landmark, jk, yandex_url } = await req.json()

    // initData dan user ID olish (ishonchli usul)
    const userId = rawUserId || (initData ? parseInitData(initData) : null)

    if (!userId || !crmId) return NextResponse.json({ ok: false, error: 'Telegram ID topilmadi. Botga /start yuboring.' })

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ ok: false, error: 'No bot token' })

    // Xabar matni — URL ham ichida
    const lines = [
      `🏠 <b>${title || `#${crmId}`}</b>`,
      price    ? `💰 ${price}` : '',
      rooms    ? `🛏 ${rooms} xona` : '',
      area     ? `📐 ${area} m²` : '',
      floor    ? `🏢 ${floor}/${totalFloors||'?'}-qavat` : '',
      jk       ? `🏗 ${jk}` : '',
      district ? `📍 ${district}` : '',
      landmark ? `🗺 ${landmark}` : '',
      `🆔 CRM #${crmId}`,
      yandex_url ? `🗺 <a href="${yandex_url}">Xaritada ko'rish</a>` : '',
      ``,
      `📞 <b>+998 91 551 44 99</b>`,
    ].filter(Boolean).join('\n')

    const replyMarkup = undefined  // URL matn ichida, alohida button kerak emas

    const photos = await getPhotos(String(crmId))

    if (photos.length === 0) {
      // Faqat matn + xarita tugmasi
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: lines,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      })
    } else if (photos.length === 1) {
      // 1 rasm + matn + xarita tugmasi
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          photo: photos[0].file_id,
          caption: lines,
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      })
    } else {
      // Bir nechta rasm — media group
      const media = photos.slice(0, 10).map((p, i) => ({
        type: 'photo',
        media: p.file_id,
        ...(i === 0 ? { caption: lines, parse_mode: 'HTML' } : {}),
      }))
      await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userId, media }),
      })
      // Alohida lokatsiya xabari kerak emas — URL caption ichida
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
