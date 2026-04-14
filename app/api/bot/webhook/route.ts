import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

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

    // Admin bo'lmagan foydalanuvchilar
    if (!ADMIN_ID || fromId.toString() !== ADMIN_ID) {
      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Assalomu alaykum! Mulk qidirish uchun pastdagi Mini App tugmasini bosing 👇"
          })
        })
      }
      return NextResponse.json({ ok: true })
    }

    // ADMIN: Rasm yuklash
    if (photos && photos.length > 0) {
      await globalThisAny.telegramLock;
      let release: any;
      globalThisAny.telegramLock = new Promise(resolve => release = resolve);

      try {
        const bestPhoto = photos[photos.length - 1]
        const fileId = bestPhoto.file_id
        const mediaGroupId = msg.media_group_id

        let crmIdMatch = text.match(/\d{4,}/)
        let crmId = crmIdMatch ? crmIdMatch[0] : null
        let house = null

        if (crmId) {
          house = await prisma.house.findUnique({ where: { crmId } })

          if (!house) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ ID: ${crmId} bazada topilmadi.\n\nAvval AmoCRM da "Mulk mini app" ustuniga qo'ying va sync bo'lishini kuting!`
              })
            })
            return NextResponse.json({ ok: true })
          }

          if (mediaGroupId) {
            await prisma.house.update({
              where: { id: house.id },
              data: { mediaGroupId }
            })
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
          const currentImages: string[] = house.images || []

          if (!currentImages.includes(imgUrl)) {
            const newImages = [...currentImages, imgUrl]
            const updateData: any = { images: newImages }
            if (!house.image || house.image.includes('unsplash.com')) {
              updateData.image = imgUrl
            }
            await prisma.house.update({
              where: { id: house.id },
              data: updateData
            })
          }

          if (crmId) {
            const totalImages = (house.images?.length || 0) + 1
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: `✅ ID: ${house.crmId} — "${house.title}" mulkka rasm qo'shildi!\n📸 Jami rasmlar: ${totalImages} ta`
              })
            })
          }
        }

      } finally {
        release();
      }

    } else {
      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 Admin, xush kelibsiz!\n\n📸 Rasm yuklash:\n1. Rasmlarni album qilib yuboring\n2. Caption ga CRM ID yozing\n\nMasalan: <b>38545823</b>\n\n🗑 Rasmlarni o'chirish: <b>/delete_images 38545823</b>`,
            parse_mode: "HTML"
          })
        })
      }

      const deleteMatch = text.match(/^\/delete_images\s+(\d+)/)
      if (deleteMatch) {
        const crmId = deleteMatch[1]
        const house = await prisma.house.findUnique({ where: { crmId } })
        if (house) {
          await prisma.house.update({
            where: { crmId },
            data: {
              images: [],
              image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
              mediaGroupId: null
            }
          })
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🗑️ ID: ${crmId} — "${house.title}" mulkning barcha rasmlari o'chirildi.`
            })
          })
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: `❌ ID: ${crmId} topilmadi.` })
          })
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[Telegram Webhook Error]', err)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 })
  }
} 
