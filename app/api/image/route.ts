import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get("id")

    if (!fileId) {
      return new NextResponse("Missing file ID", { status: 400 })
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    if (!BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not defined in .env");
      return new NextResponse("Server Configuration Error", { status: 500 })
    }

    // 1. Telegramdan fayl yo'lini (path) olish
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
    const data = await res.json()

    if (!data.ok || !data.result?.file_path) {
      return new NextResponse("File not found on Telegram", { status: 404 })
    }

    const filePath = data.result.file_path
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`

    // 2. Haqiqiy rasmni yuklab olish
    const imgRes = await fetch(fileUrl)

    if (!imgRes.ok) {
      return new NextResponse("Failed to fetch image from Telegram servers", { status: 502 })
    }

    // Rasmni stream ko'rinishida yoki buffer sifatida qaytarish
    const blob = await imgRes.blob()

    return new NextResponse(blob, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
        // Keshni 1 kunga sozlash (rasmlar o'zgarmaydi)
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      }
    })

  } catch (e) {
    console.error("Image Proxy Error:", e)
    return new NextResponse("Internal Data Fetch Error", { status: 500 })
  }
}