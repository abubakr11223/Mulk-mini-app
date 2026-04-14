require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TOKEN = process.env.AMOCRM_TOKEN;
const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';
const BASE_URL = `https://${SUBDOMAIN}.amocrm.ru/api/v4`;

const PIPELINE_ID = 10512362;
const STATUS_ID = 85060666;

// Yandex Maps short link dan koordinatalarni olish
async function getCoordinatesFromYandex(url) {
  try {
    // Short linkni resolve qilish
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
    const finalUrl = res.url;

    // ll=lng,lat yoki ll=lng%2Clat formatini parse qilish
    const llMatch = finalUrl.match(/[?&]ll=([0-9.]+)(?:%2C|,)([0-9.]+)/i);
    if (llMatch) {
      const lng = parseFloat(llMatch[1]);
      const lat = parseFloat(llMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0) {
        console.log(`[SYNC] Koordinatalar topildi: ${lat}, ${lng}`);
        return { lat, lng };
      }
    }

    // text=lat,lng formatini ham tekshirish
    const textMatch = finalUrl.match(/text=([0-9.]+)(?:%2C|,)([0-9.]+)/i);
    if (textMatch) {
      const lat = parseFloat(textMatch[1]);
      const lng = parseFloat(textMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0) {
        console.log(`[SYNC] Koordinatalar (text) topildi: ${lat}, ${lng}`);
        return { lat, lng };
      }
    }

    console.log(`[SYNC] Koordinatalar topilmadi: ${finalUrl}`);
    return null;
  } catch (e) {
    console.error(`[SYNC] Yandex link xatosi: ${e.message}`);
    return null;
  }
}

function parseCustomFields(fields) {
  let rooms = null, area = null, floor = null, totalFloors = null;
  let description = '', landmark = '', buildingType = '', yandexUrl = '', orientir = '';

  if (!fields) return { rooms, area, floor, totalFloors, description, landmark, buildingType, yandexUrl, orientir };

  const FIELD_MAP = {
    'xona': 'rooms', 'хона': 'rooms', 'комнат': 'rooms', 'кол-во комнат': 'rooms',
    'qavat': 'floor', 'этаж': 'floor', 'floor': 'floor',
    'этажность': 'totalFloors', 'umumiy qavat': 'totalFloors', 'всего этажей': 'totalFloors',
    'yuzasi': 'area', 'maydon': 'area', 'площадь': 'area', 'кв.м': 'area',
    'описание': 'description', 'izoh': 'description',
    'район': 'landmark', 'tuman': 'landmark', 'туман': 'landmark',
    'bino turi': 'buildingType', 'тип жк': 'buildingType', 'тип': 'buildingType',
    'адрес я.карта': 'yandexUrl', 'адрес я': 'yandexUrl', 'яндекс': 'yandexUrl', 'yandex': 'yandexUrl',
    'ориентир': 'orientir', 'orientir': 'orientir',
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
    } else if (mappedKey === 'yandexUrl') {
      yandexUrl = String(value);
    } else if (mappedKey === 'orientir') {
      orientir = String(value);
    }
  }

  return { rooms, area, floor, totalFloors, description, landmark, buildingType, yandexUrl, orientir };
}

async function syncLeads() {
  console.log(`[SYNC] ${new Date().toISOString()} — "Mulk mini app" statusidagi leadlar yangilanmoqda...`);
  let page = 1;
  let totalSynced = 0;

  while (true) {
    const params = new URLSearchParams({
      limit: 50,
      page: page,
      with: 'custom_fields',
      'filter[statuses][0][pipeline_id]': PIPELINE_ID,
      'filter[statuses][0][status_id]': STATUS_ID,
    });

    const url = `${BASE_URL}/leads?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (res.status === 204) break;
    if (!res.ok) {
      console.error(`[SYNC] AmoCRM error: ${res.status}`);
      break;
    }

    const data = await res.json();
    const leads = data._embedded?.leads || [];
    if (!leads.length) break;

    console.log(`[SYNC] Page ${page}: ${leads.length} ta lead topildi`);

    for (const lead of leads) {
      const crmId = String(lead.id);
      const title = lead.name || 'Yangi Mulk';
      const rawPrice = lead.price || 0;
      const newPrice = rawPrice > 0 ? `${Number(rawPrice).toLocaleString()} $` : 'Kelishilgan';

      const { rooms, area, floor, totalFloors, description, landmark, buildingType, yandexUrl, orientir } =
        parseCustomFields(lead.custom_fields_values);

      const existing = await prisma.house.findUnique({ where: { crmId } });

      // Narx logikasi
      let oldPrice = null;
      let discount = null;

      if (existing) {
        const existingNum = parseInt(existing.price.replace(/\D/g, '')) || 0;
        const newNum = parseInt(String(rawPrice)) || 0;

        if (newNum > 0 && existingNum > 0 && newNum < existingNum) {
          oldPrice = existing.price;
          discount = Math.round(((existingNum - newNum) / existingNum) * 100);
          console.log(`[SYNC] Narx tushdi: ${existing.price} → ${newPrice} (-${discount}%)`);
        } else if (newNum > existingNum) {
          oldPrice = null;
          discount = null;
        } else {
          oldPrice = existing.oldPrice || null;
          discount = existing.discount || null;
        }
      }

      // Koordinatalarni Yandex linkdan olish
      let lat = existing?.lat || null;
      let lng = existing?.lng || null;

      if (yandexUrl && yandexUrl.includes('yandex')) {
        // Faqat koordinatalar yo'q bo'lsa yoki tasodifiy bo'lsa yangilash
        const isRandomCoord = !existing || (
          existing.lat.toFixed(3) !== lat?.toFixed(3)
        );
        const coords = await getCoordinatesFromYandex(yandexUrl);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      // Orientir — landmark sifatida ishlatish
      const finalLandmark = orientir || landmark || existing?.landmark || '';

      const updateData = {
        price: newPrice,
        title,
        oldPrice,
        discount,
        ...(lat ? { lat } : {}),
        ...(lng ? { lng } : {}),
        ...(rooms !== null ? { rooms } : {}),
        ...(area !== null ? { area } : {}),
        ...(floor !== null ? { floor } : {}),
        ...(totalFloors !== null ? { totalFloors } : {}),
        ...(description ? { description } : {}),
        landmark: finalLandmark,
        ...(buildingType ? { buildingType } : {}),
      };

      const createData = {
        crmId,
        title,
        price: newPrice,
        lat: lat || (41.311081 + (Math.random() * 0.06)),
        lng: lng || (69.240562 + (Math.random() * 0.06)),
        rooms: rooms || 0,
        area: area || 0,
        floor: floor || 1,
        totalFloors: totalFloors || 1,
        description: description || '',
        landmark: finalLandmark,
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

  console.log(`[SYNC] Tayyor! ${totalSynced} ta lead yangilandi.`);
}

syncLeads().catch(console.error);

setInterval(() => {
  syncLeads().catch(console.error);
}, 2 * 60 * 1000);

console.log('[SYNC] Ishga tushdi. Har 2 daqiqada "Mulk mini app" statusidan avtosync qiladi.');
