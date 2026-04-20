import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Vercel KV ─────────────────────────────────────────────────────────────────
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

// ── Photo helpers ─────────────────────────────────────────────────────────────
type PhotoEntry = { file_id: string; file_unique_id: string }

function getPhotosFromFile(crmId: string): PhotoEntry[] {
  try {
    const raw   = readFileSync(join(process.cwd(), 'public', 'photos_cache.json'), 'utf-8')
    const cache = JSON.parse(raw)
    const entry = cache[crmId]
    if (!entry) return []
    if (Array.isArray(entry.photos)) return entry.photos
    if (entry.file_id) return [{ file_id: entry.file_id, file_unique_id: entry.file_unique_id }]
    return []
  } catch { return [] }
}

async function getPhotos(crmId: string): Promise<PhotoEntry[]> {
  // 1. KV dan olish (bot yuborgan yangi rasmlar)
  const val = await kvGet(`photo:${crmId}`)
  if (val) {
    try {
      const arr = JSON.parse(val)
      if (Array.isArray(arr) && arr.length > 0) return arr
    } catch {}
  }
  // 2. Fallback: git'ga commit qilingan JSON fayl
  return getPhotosFromFile(crmId)
}

// ── GET /api/photo/[crmId] ────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ crmId: string }> }
) {
  try {
    const { crmId } = await params
    const photos    = await getPhotos(crmId)

    // ?count=1 → rasmlar sonini qaytarish
    if (req.nextUrl.searchParams.get('count')) {
      return NextResponse.json({ count: photos.length })
    }

    if (photos.length === 0) return new NextResponse(null, { status: 404 })

    // ?index=N → N-rasm (default: 0)
    const idx   = Math.max(0, parseInt(req.nextUrl.searchParams.get('index') || '0', 10))
    const photo = photos[Math.min(idx, photos.length - 1)]
    if (!photo?.file_id) return new NextResponse(null, { status: 404 })

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return new NextResponse('No bot token', { status: 500 })

    const r = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`,
      { cache: 'no-store' }
    )
    const d = await r.json()
    if (!d.ok) return new NextResponse(null, { status: 404 })

    const url = `https://api.telegram.org/file/bot${token}/${d.result.file_path}`
    return NextResponse.redirect(url, { status: 302 })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
