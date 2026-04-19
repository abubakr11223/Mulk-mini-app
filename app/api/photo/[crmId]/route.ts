import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const CACHE = join(process.cwd(), 'public', 'photos_cache.json')

function getPhotos(entry: any): { file_id: string; file_unique_id: string }[] {
  if (!entry) return []
  if (Array.isArray(entry.photos)) return entry.photos
  if (entry.file_id) return [{ file_id: entry.file_id, file_unique_id: entry.file_unique_id }]
  return []
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ crmId: string }> }
) {
  try {
    const { crmId } = await params
    const cache = JSON.parse(readFileSync(CACHE, 'utf-8'))
    const entry = cache[crmId]
    const photos = getPhotos(entry)

    if (req.nextUrl.searchParams.get('count')) {
      return NextResponse.json({ count: photos.length })
    }

    if (photos.length === 0) return new NextResponse(null, { status: 404 })

    const idx = Math.max(0, parseInt(req.nextUrl.searchParams.get('index') || '0', 10))
    const photo = photos[idx] ?? photos[0]
    if (!photo?.file_id) return new NextResponse(null, { status: 404 })

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return new NextResponse('No bot token', { status: 500 })

    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`)
    const d = await r.json()
    if (!d.ok) return new NextResponse(null, { status: 404 })

    const url = `https://api.telegram.org/file/bot${token}/${d.result.file_path}`
    return NextResponse.redirect(url, { status: 302 })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
