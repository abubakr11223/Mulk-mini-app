import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    const params = new URLSearchParams(bodyText)
    
    // AmoCRM webhook parse
    let leadId: string | null = null
    let price: string = "0"
    let title: string = "Amocrm dan Kelgan Mulk"

    for (const [key, value] of params.entries()) {
      // Find lead ID from key (e.g. leads[status][0][id] or leads[add][0][id])
      if (key.match(/leads\[.*\]\[\d+\]\[id\]/)) {
        leadId = value
      }
      if (key.match(/leads\[.*\]\[\d+\]\[price\]/)) {
        price = value
      }
      if (key.match(/leads\[.*\]\[\d+\]\[name\]/)) {
        title = value
      }
    }

    if (!leadId) return NextResponse.json({ ok: true })

    const parsedPrice = parseInt(price) ? (parseInt(price) + " $") : "Kelishilgan"

    const existingHouse = await prisma.house.findUnique({ where: { crmId: leadId.toString() } })

    let discount = null
    let oldPrice = null

    // Check for discount logic if house already exists with a different price
    if (existingHouse && existingHouse.price !== parsedPrice) {
       const oP = parseInt(existingHouse.price.replace(/\D/g, ""))
       const nP = parseInt(price)
       if (nP < oP && oP > 0) {
          oldPrice = existingHouse.price
          discount = Math.round(((oP - nP) / oP) * 100)
       }
    }

    await prisma.house.upsert({
      where: { crmId: leadId.toString() },
      update: { 
        price: parsedPrice, 
        title: title,
        ...(oldPrice ? { oldPrice } : {}),
        ...(discount ? { discount } : {})
      },
      create: {
        crmId: leadId.toString(),
        title: title,
        price: parsedPrice,
        lat: 41.311081 + (Math.random() * 0.05), // Sal o'zgartirib xaritada joylashtirish
        lng: 69.240562 + (Math.random() * 0.05),
        rooms: 0,
        area: 0,
        floor: 1,
        totalFloors: 1,
      }
    })

    return NextResponse.json({ ok: true })
  } catch(e) {
    console.error("AmoCRM Webhook error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
