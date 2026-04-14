import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// To prevent SQLite read-modify-write race conditions when Telegram fires 4 webhooks concurrently
const globalThisAny = globalThis as any;
if (!globalThisAny.telegramLock) {
  globalThisAny.telegramLock = Promise.resolve();
}

export async function POST(req: Request) {
  try {
    const update = await req.json()
    const msg = update.message || update.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id
    const fromId = msg.from.id
    const text = msg.text || msg.caption || ""
    const photos = msg.photo

    const ADMIN_ID = process.env.ADMIN_CHAT_ID
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!BOT_TOKEN) return NextResponse.json({ error: "Missing token" }, { status: 500 })

    // Non-admin fallback
    if (!ADMIN_ID || fromId.toString() !== ADMIN_ID) {
      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Assalomu alaykum! Mulk qidirish uchun ilovaga kiring 👇",
            reply_markup: {
              inline_keyboard: [[{ text: "🏠 Ilovaga kirish", web_app: { url: "https://surgery-pretty-seasonal-maritime.trycloudflare.com" } }]]
            }
          })
        })
      }
      return NextResponse.json({ ok: true })
    }

    // Admin photo handler - FAQAT mavjud uyga rasm qo'shadi, yangi uy yaratmaydi
    if (photos && photos.length > 0) {
      await globalThisAny.telegramLock;
      let release: any;
      globalThisAny.telegramLock = new Promise(resolve => release = resolve);

      try {
        const bestPhoto = photos[photos.length - 1] 
        const fileId = bestPhoto.file_id
        const mediaGroupId = msg.media_group_id

        let crmIdMatch = text.match(/\d{5,}/)  // Kamida 5 raqamli ID
        let crmId = crmIdMatch ? crmIdMatch[0] : null
        let house = null

        if (crmId) {
          // Faqat AmoCRM dan kelgan (amocrm-sync tomonidan yaratilgan) uyni qidiradi
          house = await prisma.house.findUnique({ where: { crmId } })
          if (!house) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: `❌ ID: ${crmId} bazada topilmadi. Avval AmoCRM da "Mulk mini app" ustuniga qo'ying!` })
            })
            return NextResponse.json({ ok: true })
          }
          if (mediaGroupId) {
            await prisma.house.update({ where: { id: house.id }, data: { mediaGroupId } })
          }
        } else if (mediaGroupId) {
          house = await prisma.house.findFirst({ where: { mediaGroupId } })
          if (!house) {
            await new Promise(r => setTimeout(r, 2000));
            house = await prisma.house.findFirst({ where: { mediaGroupId } })
          }
        }

        if (house) {
          const imgUrl = `/api/image?id=${fileId}`
          let newImages = house.images || []
          if (!newImages.includes(imgUrl)) newImages.push(imgUrl)
          let updateData: any = { images: newImages }
          if (!house.image || house.image.includes('unsplash.com')) updateData.image = imgUrl
          await prisma.house.update({ where: { id: house.id }, data: updateData })
          if (crmId) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: `✅ ID: ${house.crmId} mulkka rasm qo'shildi!` })
            })
          }
        }
      } finally {
        release();
      }
    } else {
        if (text === "/start") {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
               method: "POST", headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ 
                 chat_id: chatId, 
                 text: `Admin Xush kelibsiz!\n\nRasmlarni 4 ta qilib bitta guruh (album) holida jo'nating va *IZOH* (Caption) ga aynan CRM dagi ID raqamini qo'shib yuboring! Masalan: 1102`,
                 reply_markup: {
                   inline_keyboard: [[{ text: "🏠 Ilovaga kirish", web_app: { url: "https://surgery-pretty-seasonal-maritime.trycloudflare.com" } }]]
                 }
               })
            })
        }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
}
