import { NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const north = Number(searchParams.get("north")) || 90
  const south = Number(searchParams.get("south")) || -90
  const east = Number(searchParams.get("east")) || 180
  const west = Number(searchParams.get("west")) || -180

  try {
    const houses = await prisma.house.findMany({
      where: {
        lat: {
          lte: north,
          gte: south,
        },
        lng: {
          lte: east,
          gte: west,
        },
      },
    })

    return NextResponse.json(houses)
  } catch (error) {
    return NextResponse.json({ error: "Failed to load houses" }, { status: 500 })
  }
}