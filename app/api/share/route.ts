import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const KV_URL = (process.env.KV_REST_API_URL || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN || ''
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://joyme-clone.vercel.app'

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

async function kvGet(key: string): Promise<string | null> {
  const res = await kvPipeline([['get', key]])
  return res[0]?.result ?? null
}

type PhotoEntry = { file_id: string; file_unique_id: string }

function getPhotosFromFile(id: string): PhotoEntry[] {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'photos_cache.json'), 'utf-8')
    const cache = JSON.parse(raw)
    const entry = cache[id]
    if (!entry) return []
    if (Array.isArray(entry.photos)) return entry.photos
    if (entry.file_id) return [{ file_id: entry.file_id, file_unique_id: entry.file_unique_id }]
    return []
  } catch { return [] }
}

// QO'SHILDI: Endi bu funksiya ham crmId (raqam), ham olx_id (MUL-XX) ni qabul qiladi
async function getPhotos(id: string): Promise<PhotoEntry[]> {
  const listRes = await kvPipeline([['lrange', `photolist:${id}`, 0, -1]])
  const list: string[] = listRes[0]?.result ?? []
  if (list.length > 0) {
    return list.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean) as PhotoEntry[]
  }
  const val = await kvGet(`photo:${id}`)
  if (val) {
    try {
      const arr = JSON.parse(val)
      if (Array.isArray(arr) && arr.length > 0) return arr
    } catch { }
  }
  return getPhotosFromFile(id)
}

async function getFileUrl(token: string, fileId: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, { cache: 'no-store' })
    const d = await r.json()
    if (!d.ok) return null
    return `https://api.telegram.org/file/bot${token}/${d.result.file_path}`
  } catch { return null }
}

function parseChatId(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user?.id) return Number(user.id)
    }
    const chatStr = params.get('chat')
    if (chatStr) {
      const chat = JSON.parse(chatStr)
      if (chat?.id) return Number(chat.id)
    }
    return null
  } catch { return null }
}

// POST /api/share
// Body: { crmId: number, olx_id?: string, chatId?: number, initData?: string, caption: string }
export async function POST(req: NextRequest) {
  try {
    const { crmId, olx_id, chatId: rawChatId, initData, caption } = await req.json()

    const chatId: number | null =
      (rawChatId ? Number(rawChatId) : null) ||
      (initData ? parseChatId(initData) : null)

    if (!crmId || !chatId) {
      return NextResponse.json({
        ok: false,
        error: `chatId topilmadi`,
        debug: { rawChatId, hasInitData: !!initData, initDataLen: initData?.length ?? 0 }
      }, { status: 400 })
    }

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ ok: false, error: 'no bot token' }, { status: 500 })

    // QO'SHILDI: Agar olx_id (MUL-XX) mavjud bo'lsa, qidiruv uchun shuni ishlatamiz. Yo'qsa crmId ni ishlatamiz.
    const searchId = olx_id ? String(olx_id) : String(crmId)
    const photos = await getPhotos(searchId)

    if (photos.length === 0) {
      const photoUrl = `${BASE_URL}/api/photo/${searchId}`
      const rp = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
        cache: 'no-store',
      })
      const dp = await rp.json()
      if (dp.ok) return NextResponse.json({ ok: true, method: 'sendPhoto:proxy' })

      const ogUrl = `${BASE_URL}/api/og/${searchId}`
      const rOg = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: ogUrl, caption }),
        cache: 'no-store',
      })
      const dOg = await rOg.json()
      if (dOg.ok) return NextResponse.json({ ok: true, method: 'sendPhoto:og' })

      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: caption }),
        cache: 'no-store',
      })
      const d = await r.json()
      return NextResponse.json({ ok: d.ok, method: 'sendMessage', telegram: d })
    }

    if (photos.length === 1) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: photos[0].file_id, caption }),
        cache: 'no-store',
      })
      const d = await r.json()
      if (d.ok) return NextResponse.json({ ok: true, method: 'sendPhoto:file_id' })

      const fileUrl = await getFileUrl(token, photos[0].file_id)
      if (fileUrl) {
        const r2 = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, photo: fileUrl, caption }),
          cache: 'no-store',
        })
        const d2 = await r2.json()
        if (d2.ok) return NextResponse.json({ ok: true, method: 'sendPhoto:url' })
      }

      const r3 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: caption + `\n\n📸 ${BASE_URL}/api/photo/${searchId}`,
        }),
        cache: 'no-store',
      })
      const d3 = await r3.json()
      return NextResponse.json({ ok: d3.ok, method: 'sendMessage:fallback', telegram: d3 })
    }

    const mediaGroup = photos.slice(0, 10).map((p, i) => ({
      type: 'photo',
      media: p.file_id,
      ...(i === 0 ? { caption } : {}),
    }))

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, media: mediaGroup }),
      cache: 'no-store',
    })
    const d = await r.json()
    if (d.ok) return NextResponse.json({ ok: true, method: 'sendMediaGroup' })

    const r2 = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photos[0].file_id, caption }),
      cache: 'no-store',
    })
    const d2 = await r2.json()
    if (d2.ok) return NextResponse.json({ ok: true, method: 'sendPhoto:first_only' })

    const r3 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption + `\n\n📸 ${BASE_URL}/api/photo/${searchId}`,
      }),
      cache: 'no-store',
    })
    const d3 = await r3.json()
    return NextResponse.json({ ok: d3.ok, method: 'sendMessage:fallback', telegram: d3 })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}