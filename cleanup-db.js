require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// "Mulk mini app" voronkasidagi lead IDlar
const PIPELINE_ID = 10512362;
const STATUS_ID = 85060666;
const TOKEN = process.env.AMOCRM_TOKEN;
const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';

async function main() {
  // 1. AmoCRM dan "Mulk mini app" lead IDlarini olish
  const url = `https://${SUBDOMAIN}.amocrm.ru/api/v4/leads?limit=100&with=custom_fields&filter[statuses][0][pipeline_id]=${PIPELINE_ID}&filter[statuses][0][status_id]=${STATUS_ID}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await res.json();
  const validCrmIds = (data._embedded?.leads || []).map(l => String(l.id));
  
  console.log('Mulk mini app lead IDlari:', validCrmIds);
  
  // 2. Barcha eski uylarni o'chirish (faqat Mulk mini app leidlarini qoldirish)
  const deleted = await prisma.house.deleteMany({
    where: {
      NOT: {
        crmId: { in: validCrmIds }
      }
    }
  });
  
  console.log(`${deleted.count} ta eski uy o'chirildi`);
  console.log('Faqat Mulk mini app uylar qoldi!');
  
  await prisma.$disconnect();
}

main().catch(console.error);
