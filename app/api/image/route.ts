import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("id")
  if (!fileId) return new NextResponse("Missing file ID", { status: 400 })

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!BOT_TOKEN) return new NextResponse("Configuration Error", { status: 500 })

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
    const data = await res.json()
    
    if (!data.ok) return new NextResponse("File not found on Telegram", { status: 404 })

    const filePath = data.result.file_path
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`

    const imgRes = await fetch(fileUrl)
    return new NextResponse(imgRes.body, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      }
    })
  } catch(e) {
    return new NextResponse("Internal Data Fetch Error", { status: 500 })
  }
}
