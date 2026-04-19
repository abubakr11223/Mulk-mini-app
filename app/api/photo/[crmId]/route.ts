import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const CACHE = join(process.cwd(), 'public', 'photos_cache.json')

export async function GET(
  _req: NextRequest,
  { params }: { params: { crmId: string } }
) {
  try {
    const cache = JSON.parse(readFileSync(CACHE, 'utf-8'))
    const entry = cache[params.crmId]
    if (!entry?.file_id) return new NextResponse(null, { status: 404 })

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return new NextResponse('No bot token', { status: 500 })

    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${entry.file_id}`)
    const d = await r.json()
    if (!d.ok) return new NextResponse(null, { status: 404 })

    const url = `https://api.telegram.org/file/bot${token}/${d.result.file_path}`
    return NextResponse.redirect(url, { status: 302 })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
