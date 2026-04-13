import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST requests from the CRM Webhook
export async function POST(req: Request) {
  try {
    const data = await req.json()
    // Data expected from CRM:
    // {
    //   "crmId": "1102",
    //   "title": "Mirobod, Tayyor dizayn",
    //   "price": "105 000 $",
    //   "oldPrice": "120 000 $",
    //   "discount": 15,
    //   "lat": 41.2995,
    //   "lng": 69.2401,
    //   "rooms": 4,
    //   "area": 120,
    //   "floor": 2,
    //   "totalFloors": 5,
    //   "buildingType": "Novostroyka",
    //   "landmark": "Lokomotiv parki",
    //   "description": "Zo'r uy..."
    // }

    if (!data.crmId) {
      return NextResponse.json({ error: "Missing crmId" }, { status: 400 })
    }

    // Upsert logic: if CRM ID exists, we UPDATE it. If not, we CREATE it!
    const house = await prisma.house.upsert({
      where: { crmId: data.crmId.toString() },
      update: {
        title: data.title,
        price: data.price,
        oldPrice: data.oldPrice || null,
        discount: data.discount || null,
        lat: data.lat,
        lng: data.lng,
        rooms: data.rooms,
        area: data.area,
        floor: data.floor,
        totalFloors: data.totalFloors,
        buildingType: data.buildingType,
        landmark: data.landmark,
        description: data.description,
      },
      create: {
        crmId: data.crmId.toString(),
        title: data.title || "Yangi Mulk",
        price: data.price || "0 $",
        oldPrice: data.oldPrice || null,
        discount: data.discount || null,
        lat: data.lat || 41.3,
        lng: data.lng || 69.2,
        rooms: data.rooms || 0,
        area: data.area || 0,
        floor: data.floor || 0,
        totalFloors: data.totalFloors || 0,
        buildingType: data.buildingType || "",
        landmark: data.landmark || "",
        description: data.description || "",
      }
    })

    return NextResponse.json({ success: true, house })
  } catch(e) {
    console.error("CRM Sync Error:", e)
    return NextResponse.json({ error: "Failed to sync from CRM" }, { status: 500 })
  }
}
