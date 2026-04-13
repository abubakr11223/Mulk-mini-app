import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.house.deleteMany()

  const houses = [
    { 
      lat: 41.2995, lng: 69.2401, 
      price: "120 000 $", hot: true, 
      title: "Chilonzor 3-xona, 80m²", 
      description: "Yangi ta'mirdan chiqqan kelishilgan narxda, shoshilinch. O'ziga to'q xaridorlar uchun ideal sarmoya.",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800",
      rooms: 3, area: 80, floor: 4, crmId: "5543"
    },
    { 
      lat: 41.31, lng: 69.25, 
      price: "95 000 $", hot: false,
      title: "Yunusobod 2-xona, 65m²", 
      description: "Eski g'ishtli dom, infrastrukturasi to'liq rivojlangan makon. Metrolar yonida.",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800",
      rooms: 2, area: 65, floor: 2, crmId: "1284"
    },
    { 
      lat: 41.28, lng: 69.26, 
      price: "70 000 $", hot: true,
      title: "Sergeli 1-xona, 42m²", 
      description: "Arzon va chiroyli dizayndagi shinam kvartira.",
      image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=800",
      rooms: 1, area: 42, floor: 7, crmId: "9932"
    },
    { 
      lat: 41.35, lng: 69.30, 
      price: "150 000 $", hot: false,
      title: "Mirzo Ulug'bek, Kottej 120m²", 
      description: "Eksklyuziv uchastka! Oilaviy hayot uchun ajoyib bog'li uy.",
      image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=800",
      rooms: 5, area: 120, floor: 2, crmId: "1102"
    },
    { 
      lat: 41.26, lng: 69.22, 
      price: "60 000 $", hot: false,
      title: "Yakkasaroy, 1-xona qora suvoq", 
      description: "Sarmoya uchun yaxshi uy. Remont qilinmagan.",
      image: "https://images.unsplash.com/photo-1593696140826-c58b021acf8b?q=80&w=800",
      rooms: 1, area: 38, floor: 9, crmId: "2031"
    },
    { 
      lat: 41.33, lng: 69.28, 
      price: "105 000 $", hot: true,
      title: "Mirobod, Tayyor dizayn", 
      description: "Premium joy, boy muhit, ko'zga ko'ringan yopiq ob'ekt.",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800",
      rooms: 3, area: 90, floor: 5, crmId: "8472"
    }
  ]

  for (const h of houses) {
    await prisma.house.create({ data: h })
  }
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
