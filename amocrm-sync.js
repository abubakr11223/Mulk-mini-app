require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TOKEN = process.env.AMOCRM_TOKEN;
const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';
const BASE_URL = `https://${SUBDOMAIN}.amocrm.ru/api/v4`;

// Faqat "Mulk mini app" ustunidagi leadlarni ol
const PIPELINE_ID = 10512362;
const STATUS_ID = 85060666; // "Mulk mini app" status

async function fetchLeads(page = 1) {
  // Pipeline bo'yicha filter - status ID ni kodda filtrlaymiz
  const url = `${BASE_URL}/leads?limit=50&page=${page}&with=custom_fields&filter[pipeline_id][]=${PIPELINE_ID}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    console.error(`[SYNC] AmoCRM error: ${res.status}`);
    return null;
  }
  const data = await res.json();
  // Faqat "Mulk mini app" statusidagi leadlarni qoldir
  if (data._embedded?.leads) {
    data._embedded.leads = data._embedded.leads.filter(l => l.status_id === STATUS_ID);
  }
  return data;
}


function parseCustomFields(fields) {
  let rooms = null, area = null, floor = null, totalFloors = null;
  let description = '', landmark = '', buildingType = '';

  if (!fields) return { rooms, area, floor, totalFloors, description, landmark, buildingType };

  const FIELD_MAP = {
    'xona': 'rooms', 'хона': 'rooms', 'комнат': 'rooms',
    'qavat': 'floor', 'этаж': 'floor', 'floor': 'floor',
    'umumiy qavat': 'totalFloors', 'всего этажей': 'totalFloors',
    'yuzasi': 'area', 'maydon': 'area', 'sotix': 'area', 'площадь': 'area', 'кв.м': 'area',
    'описание': 'description', 'izoh': 'description',
    'район': 'landmark', 'tuman': 'landmark',
    'bino turi': 'buildingType', 'тип': 'buildingType',
  };

  for (const cf of fields) {
    const name = (cf.field_name || '').toLowerCase();
    const value = cf.values?.[0]?.value;
    if (!value) continue;

    let mappedKey = null;
    for (const [key, val] of Object.entries(FIELD_MAP)) {
      if (name.includes(key)) { mappedKey = val; break; }
    }
    if (!mappedKey) continue;

    if (mappedKey === 'rooms') {
      const v = parseInt(String(value).replace(/\D/g, ''));
      rooms = (!isNaN(v) && v > 0 && v < 50) ? v : null;
    } else if (mappedKey === 'area') {
      const v = parseFloat(String(value).replace(/[^\d.]/g, ''));
      area = (!isNaN(v) && v > 0 && v < 5000) ? v : null;
    } else if (mappedKey === 'floor') {
      const v = parseInt(String(value).replace(/\D/g, ''));
      floor = (!isNaN(v) && v > 0 && v < 150) ? v : null;
    } else if (mappedKey === 'totalFloors') {
      const v = parseInt(String(value).replace(/\D/g, ''));
      totalFloors = (!isNaN(v) && v > 0 && v < 150) ? v : null;
    } else if (mappedKey === 'description') {
      description = String(value);
    } else if (mappedKey === 'landmark') {
      landmark = String(value);
    } else if (mappedKey === 'buildingType') {
      buildingType = String(value);
    }
  }

  return { rooms, area, floor, totalFloors, description, landmark, buildingType };
}

async function syncLeads() {
  console.log(`[SYNC] ${new Date().toISOString()} — "Mulk mini app" statusidagi leadlar yangilanmoqda...`);
  let page = 1;
  let totalSynced = 0;

  while (true) {
    // To'g'ri AmoCRM filter sintaksisi: filter[statuses][0][pipeline_id] va filter[statuses][0][status_id]
    const params = new URLSearchParams({
      limit: 50,
      page: page,
      with: 'custom_fields',
      'filter[statuses][0][pipeline_id]': PIPELINE_ID,
      'filter[statuses][0][status_id]': STATUS_ID,
    });
    const url = `${BASE_URL}/leads?${params.toString()}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    
    if (res.status === 204) break;
    if (!res.ok) {
      console.error(`[SYNC] AmoCRM error: ${res.status}`);
      break;
    }
    
    const data = await res.json();
    const leads = data._embedded?.leads || [];
    if (!leads.length) break;

    console.log(`[SYNC] Page ${page}: ${leads.length} ta "Mulk mini app" leid topildi`);

    for (const lead of leads) {

      const crmId = String(lead.id);
      const title = lead.name || 'Yangi Mulk';
      const rawPrice = lead.price || 0;
      const price = rawPrice > 0 ? `${Number(rawPrice).toLocaleString()} $` : 'Kelishilgan';

      const { rooms, area, floor, totalFloors, description, landmark, buildingType } =
        parseCustomFields(lead.custom_fields_values);

      const updateData = {
        price, // Narx har doim yangilanadi!
        title,
        ...(rooms !== null ? { rooms } : {}),
        ...(area !== null ? { area } : {}),
        ...(floor !== null ? { floor } : {}),
        ...(totalFloors !== null ? { totalFloors } : {}),
        ...(description ? { description } : {}),
        ...(landmark ? { landmark } : {}),
        ...(buildingType ? { buildingType } : {}),
      };

      const createData = {
        crmId,
        title,
        price,
        lat: 41.311081 + (Math.random() * 0.06),
        lng: 69.240562 + (Math.random() * 0.06),
        rooms: rooms || 0,
        area: area || 0,
        floor: floor || 1,
        totalFloors: totalFloors || 1,
        description: description || '',
        landmark: landmark || '',
        buildingType: buildingType || 'Novostroyka',
      };

      await prisma.house.upsert({
        where: { crmId },
        update: updateData,
        create: createData,
      });

      totalSynced++;
    }

    if (!data._links?.next) break;
    page++;
  }

  console.log(`[SYNC] Tayyor! ${totalSynced} ta "Mulk mini app" leid yangilandi.`);
}

// Darhol ishla
syncLeads().catch(console.error);

// Har 5 daqiqada qayta ishla
setInterval(() => {
  syncLeads().catch(console.error);
}, 5 * 60 * 1000);

console.log('[SYNC] Ishga tushdi. Har 5 daqiqada "Mulk mini app" statusidan avtosync qiladi.');
