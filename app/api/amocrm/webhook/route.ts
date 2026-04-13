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

    let rooms: number | null = null
    let area: number | null = null
    let floor: number | null = null
    let description: string = "Rieltorlar uchun maxsus yopiq mulk."

    const keys = Array.from(params.keys())
    
    for (const [key, value] of params.entries()) {
      if (key.match(/leads\[.*\]\[\d+\]\[id\]/)) leadId = value
      if (key.match(/leads\[.*\]\[\d+\]\[price\]/)) price = value
      if (key.match(/leads\[.*\]\[\d+\]\[name\]/)) title = value
      if (key.match(/leads\[.*\]\[\d+\]\[pipeline_id\]/)) {
        if (value.toString() !== "10512362") {
          console.log("[Webhook] Boshqa voronkadagi uy kiritilmadi: ", value);
          return NextResponse.json({ ok: true })
        }
      }
      
      // Parse Custom Fields by name
      if (key.match(/leads\[.*\]\[custom_fields\]\[\d+\]\[name\]/)) {
         const nameVal = value.toLowerCase()
         const valueKey = key.replace('[name]', '[values][0][value]')
         const actualValue = params.get(valueKey)
         
         if (actualValue) {
             if (nameVal.includes('xona') || nameVal.includes('комнат')) {
                 rooms = parseInt(actualValue.replace(/\D/g, ''))
             }
             if (nameVal.includes('qavat') || nameVal.includes('этаж') || nameVal.includes('floor')) {
                 floor = parseInt(actualValue.replace(/\D/g, ''))
             }
             if (nameVal.includes('kavadr') || nameVal.includes('kv') || nameVal.includes('yuzasi') || nameVal.includes('площадь') || nameVal.includes('общая') || nameVal.includes('sotix') || nameVal.includes('maydon')) {
                 area = parseInt(actualValue.replace(/\D/g, ''))
             }
             if (nameVal.includes('opisaniye') || nameVal.includes('описание') || nameVal.includes('izoh') || nameVal.includes('matn')) {
                 description = actualValue
             }
         }
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

    let updatePayload: any = { 
        price: parsedPrice, 
        title: title,
        ...(oldPrice ? { oldPrice } : {}),
        ...(discount ? { discount } : {})
    }
    if (rooms !== null && !isNaN(rooms)) updatePayload.rooms = rooms;
    if (area !== null && !isNaN(area)) updatePayload.area = area;
    if (floor !== null && !isNaN(floor)) updatePayload.floor = floor;
    if (description !== "Rieltorlar uchun maxsus yopiq mulk.") updatePayload.description = description;

    await prisma.house.upsert({
      where: { crmId: leadId.toString() },
      update: updatePayload,
      create: {
        crmId: leadId.toString(),
        title: title,
        price: parsedPrice,
        description: description,
        lat: 41.311081 + (Math.random() * 0.05), // Sal o'zgartirib xaritada joylashtirish
        lng: 69.240562 + (Math.random() * 0.05),
        rooms: rooms !== null ? rooms : 0,
        area: area !== null ? area : 0,
        floor: floor !== null ? floor : 1,
        totalFloors: 1,
      }
    })

    return NextResponse.json({ ok: true })
  } catch(e) {
    console.error("AmoCRM Webhook error", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
