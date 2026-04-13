import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
              inline_keyboard: [[{ text: "🏠 Ilovaga kirish", web_app: { url: "https://helena-compressed-ungladly.ngrok-free.dev" } }]]
            }
          })
        })
      }
      return NextResponse.json({ ok: true })
    }

    // Admin Commands
    if (photos && photos.length > 0) {
      const bestPhoto = photos[photos.length - 1] 
      const fileId = bestPhoto.file_id
      const mediaGroupId = msg.media_group_id

      let crmIdMatch = text.match(/\d+/)
      let crmId = crmIdMatch ? crmIdMatch[0] : null
      let house = null

      if (crmId) {
        house = await prisma.house.findUnique({ where: { crmId } })
        if (!house) {
          // AmoCRM webhooks depend on network/ngrok stability. By directly creating here, 
          // we guarantee the house will exist if the admin sends a photo with an ID!
          house = await prisma.house.create({
            data: {
              crmId,
              title: "Yangi Mulk",
              price: "Kelishilgan",
              lat: 41.311081 + (Math.random() * 0.05),
              lng: 69.240562 + (Math.random() * 0.05),
              mediaGroupId
            }
          })
        }
        if (house && mediaGroupId) {
          await prisma.house.update({
            where: { id: house.id },
            data: { mediaGroupId }
          })
        }
      } else if (mediaGroupId) {
        house = await prisma.house.findFirst({ where: { mediaGroupId } })
      }

      if (house) {
        const imgUrl = `/api/image?id=${fileId}`
        
        let updateData: any = {
           images: { push: imgUrl }
        }
        
        if (!house.image || house.image.includes('unsplash.com')) {
           updateData.image = imgUrl
        }
        
        await prisma.house.update({
           where: { id: house.id },
           data: updateData
        })
        
        if (crmId) {
           await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: `✅ ID: ${house.crmId} bazadagi mulkka rasm qo'shildi!` })
           })
        }
      } else {
        if (crmId) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: `❌ Avtomatik yaratishda xato yuz berdi.` })
          })
        }
      }
    } else {
       if (text === "/start") {
           await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: `Admin Xush kelibsiz!\n\nRasmlarni 4 ta qilib bitta guruh (album) holida jo'nating va *IZOH* (Caption) ga aynan CRM dagi ID raqamini qo'shib yuboring! Masalan: 1102` })
           })
       }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
}
