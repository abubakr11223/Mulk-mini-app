import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const CACHE = join(process.cwd(), 'public', 'photos_cache.json')

function readCache(): Record<string, { file_id: string; file_unique_id: string }> {
  try { return JSON.parse(readFileSync(CACHE, 'utf-8')) } catch { return {} }
}
function saveCache(c: Record<string, any>) {
  writeFileSync(CACHE, JSON.stringify(c, null, 2))
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update.message || update.channel_post
    if (!msg) return NextResponse.json({ ok: true })

    // Handle multiple photos (media_group)
    const photos = msg.photo
    if (!photos || photos.length === 0) return NextResponse.json({ ok: true })

    const caption = msg.caption || msg.text || ''
    // Extract CRM ID: any 5-9 digit number in caption
    const match = caption.match(/\b(\d{5,9})\b/)
    if (!match) {
      console.log('No CRM ID found in caption:', caption.slice(0, 100))
      return NextResponse.json({ ok: true })
    }

    const crmId = match[1]
    const photo = photos[photos.length - 1] // largest size

    const cache = readCache()
    cache[crmId] = {
      file_id: photo.file_id,
      file_unique_id: photo.file_unique_id,
    }
    saveCache(cache)
    console.log(`✅ Photo saved for CRM #${crmId}`)
  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook active' })
}
