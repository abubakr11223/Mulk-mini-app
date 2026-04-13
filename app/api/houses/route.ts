import { NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

export const dynamic = 'force-dynamic' // Force Next.js not to cache
export const revalidate = 0

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const north = Number(searchParams.get("north")) || 90
  const south = Number(searchParams.get("south")) || -90
  const east = Number(searchParams.get("east")) || 180
  const west = Number(searchParams.get("west")) || -180

  try {
    // Faqat AmoCRM "Mulk mini app" dan kelgan uylar (numeric crmId, bot created entries are "Nr...")
    // Valid AmoCRM IDs are purely numeric strings
    const allHouses = await prisma.house.findMany({
      where: {
        lat: { lte: north, gte: south },
        lng: { lte: east, gte: west },
      },
    })

    // Filter: faqat to'liq raqamdan iborat crmId lar (AmoCRM lead IDlar)
    const houses = allHouses.filter((h: { crmId: string | null }) => h.crmId && /^\d+$/.test(h.crmId))

    return NextResponse.json(houses)

  } catch (error) {
    return NextResponse.json({ error: "Failed to load houses" }, { status: 500 })
  }
}