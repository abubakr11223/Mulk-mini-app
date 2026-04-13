import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.house.deleteMany() // Tozalash

  const houses = [
    { lat: 41.2995, lng: 69.2401, price: "120 000 $", hot: true },
    { lat: 41.31, lng: 69.25, price: "95 000 $", hot: false },
    { lat: 41.28, lng: 69.26, price: "70 000 $", hot: true },
    { lat: 41.35, lng: 69.30, price: "150 000 $", hot: false },
    { lat: 41.26, lng: 69.22, price: "60 000 $", hot: false },
    { lat: 41.33, lng: 69.28, price: "105 000 $", hot: true }
  ]

  console.log(`Ma'lumotlar bazasiga yozish boshlandi ...`)
  for (const h of houses) {
    const house = await prisma.house.create({
      data: h,
    })
    console.log(`Qo'shildi id: ${house.id} - ${house.price}`)
  }
  console.log(`Bazaga yozish tugatildi.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
