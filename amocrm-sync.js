require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TOKEN = process.env.AMOCRM_TOKEN;
const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';
const BASE_URL = `https://${SUBDOMAIN}.amocrm.ru/api/v4`;

const FIELD_MAP = {
  'xona': 'rooms',
  'хона': 'rooms',
  'комнат': 'rooms',
  'qavat': 'floor',
  'этаж': 'floor',
  'floor': 'floor',
  'qavat soni': 'totalFloors',
  'umumiy qavat': 'totalFloors',
  'всего этажей': 'totalFloors',
  'total floor': 'totalFloors',
  'yuzasi': 'area',
  'maydon': 'area',
  'sotix': 'area',
  'площадь': 'area',
  'kv.m': 'area',
  'описание': 'description',
  'izoh': 'description',
  'район': 'landmark',
  'tuman': 'landmark',
  'joy': 'landmark',
  'novostrоyka': 'buildingType',
  'bino turi': 'buildingType',
  'тип здания': 'buildingType',
  'bino': 'buildingType',
};

function mapField(fieldName) {
  const lower = fieldName.toLowerCase();
  for (const [key, val] of Object.entries(FIELD_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

async function fetchLeads(page = 1) {
  const res = await fetch(`${BASE_URL}/leads?limit=50&page=${page}&with=custom_fields`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  if (!res.ok) {
    console.error(`[SYNC] AmoCRM error: ${res.status}`);
    return null;
  }
  return res.json();
}

async function syncAllLeads() {
  console.log(`[SYNC] ${new Date().toISOString()} — AmoCRM sync boshlandi...`);
  let page = 1;
  let totalSynced = 0;

  while (true) {
    const data = await fetchLeads(page);
    if (!data || !data._embedded || !data._embedded.leads.length) break;

    const leads = data._embedded.leads;

    for (const lead of leads) {
      const crmId = String(lead.id);
      const title = lead.name || 'Yangi Mulk';
      const rawPrice = lead.price || 0;
      const price = rawPrice > 0 ? `${rawPrice.toLocaleString()} $` : 'Kelishilgan';

      // Parse custom fields
      let rooms = null, area = null, floor = null, totalFloors = null;
      let description = '', landmark = '', buildingType = '';

      if (lead.custom_fields_values) {
        for (const cf of lead.custom_fields_values) {
          const mapped = mapField(cf.field_name || '');
          const value = cf.values?.[0]?.value;
          if (!mapped || !value) continue;

          if (mapped === 'rooms') {
            const v = parseInt(String(value).replace(/\D/g, ''));
            rooms = (!isNaN(v) && v > 0 && v < 100) ? v : null;
          } else if (mapped === 'area') {
            const v = parseInt(String(value).replace(/\D/g, ''));
            area = (!isNaN(v) && v > 0 && v < 10000) ? v : null;
          } else if (mapped === 'floor') {
            const v = parseInt(String(value).replace(/\D/g, ''));
            floor = (!isNaN(v) && v > 0 && v < 200) ? v : null;
          } else if (mapped === 'totalFloors') {
            const v = parseInt(String(value).replace(/\D/g, ''));
            totalFloors = (!isNaN(v) && v > 0 && v < 200) ? v : null;
          }
          else if (mapped === 'description') description = String(value);
          else if (mapped === 'landmark') landmark = String(value);
          else if (mapped === 'buildingType') buildingType = String(value);
        }
      }

      const existing = await prisma.house.findUnique({ where: { crmId } });

      const updateData = {
        title,
        price,
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
        lat: 41.311081 + (Math.random() * 0.05),
        lng: 69.240562 + (Math.random() * 0.05),
        rooms: rooms || 0,
        area: area || 0,
        floor: floor || 1,
        totalFloors: totalFloors || 1,
        description: description || '',
        landmark: landmark || '',
        buildingType: buildingType || '',
      };

      await prisma.house.upsert({
        where: { crmId },
        update: updateData,
        create: createData,
      });

      totalSynced++;
    }

    // Check if there's a next page
    if (!data._links?.next) break;
    page++;
  }

  console.log(`[SYNC] Tayyor! ${totalSynced} ta lead yangilandi.`);
}

// Run immediately on start
syncAllLeads().catch(console.error);

// Then every 5 minutes
setInterval(() => {
  syncAllLeads().catch(console.error);
}, 5 * 60 * 1000);

console.log('[SYNC] AmoCRM Sync dasturi ishga tushdi. Har 5 daqiqada yangilanadi.');
