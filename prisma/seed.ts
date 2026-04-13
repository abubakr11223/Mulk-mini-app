import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.house.deleteMany() // Tozalash

  const houses = [
    { 
      lat: 41.2995, lng: 69.2401, 
      price: "120 000 $", hot: true, 
      title: "Chilonzor 3-xona, 80m²", 
      description: "Yangi ta'mirdan chiqqan kelishilgan narxda, shoshilinch. O'ziga to'q xaridorlar uchun ideal sarmoya.",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800"
    },
    { 
      lat: 41.31, lng: 69.25, 
      price: "95 000 $", hot: false,
      title: "Yunusobod 2-xona, 65m²", 
      description: "Eski g'ishtli dom, infrastrukturasi to'liq rivojlangan makon. Metrolar yonida.",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800"
    },
    { 
      lat: 41.28, lng: 69.26, 
      price: "70 000 $", hot: true,
      title: "Sergeli 1-xona, 42m²", 
      description: "Arzon va chiroyli dizayndagi shinam kvartira.",
      image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=800"
    },
    { 
      lat: 41.35, lng: 69.30, 
      price: "150 000 $", hot: false,
      title: "Mirzo Ulug'bek, Kottej 120m²", 
      description: "Eksklyuziv uchastka! Oilaviy hayot uchun ajoyib bog'li uy.",
      image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=800"
    },
    { 
      lat: 41.26, lng: 69.22, 
      price: "60 000 $", hot: false,
      title: "Yakkasaroy, 1-xona qora suvoq", 
      description: "Sarmoya uchun yaxshi uy. Remont qilinmagan.",
      image: "https://images.unsplash.com/photo-1593696140826-c58b021acf8b?q=80&w=800"
    },
    { 
      lat: 41.33, lng: 69.28, 
      price: "105 000 $", hot: true,
      title: "Mirobod, Tayyor dizayn", 
      description: "Premium joy, boy muhit, ko'zga ko'ringan yopiq ob'ekt.",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800"
    }
  ]

  console.log(`Ma'lumotlar bazasiga yozish boshlandi ...`)
  for (const h of houses) {
    const house = await prisma.house.create({
      data: h,
    })
    console.log(`Qo'shildi id: ${house.id} - ${house.title}`)
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
