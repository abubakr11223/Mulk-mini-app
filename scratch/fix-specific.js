require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function extractCoords(coordinates) {
  if (!coordinates) return null;
  let target = coordinates;
  if (coordinates.includes('http')) {
    try {
      console.log(`[DEBUG] Resolving: ${coordinates}`);
      const res = await fetch(coordinates, { 
        redirect: 'follow',
        headers: {
           'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        }
      });
      target = res.url;
      console.log(`[DEBUG] Final URL: ${target}`);
      
      const url = new URL(target.replace(/%2C/g, ','));
      const pt = url.searchParams.get('pt') || url.searchParams.get('text');
      if (pt) {
         const m = pt.match(/(\d{2}\.\d+)[^\d]+(\d{2}\.\d+)/);
         if (m) {
            const n1 = parseFloat(m[1]);
            const n2 = parseFloat(m[2]);
            const lat = [n1, n2].find(n => n >= 40 && n <= 42);
            const lng = [n1, n2].find(n => n >= 68 && n <= 71);
            if (lat && lng) return { lat, lng };
         }
      }
    } catch (e) {
      console.error(`[COORDS] Resolution failed: ${coordinates}`, e.message);
    }
  }

  const matches = target.match(/(\d{2}\.\d+)/g);
  if (matches && matches.length >= 2) {
    const nums = matches.map(parseFloat);
    let lat = nums.find(n => n >= 41.0 && n <= 41.7);
    let lng = nums.find(n => n >= 69.0 && n <= 69.7);
    if (!lat || !lng) {
      lat = nums.find(n => n >= 38 && n <= 43);
      lng = nums.find(n => n >= 65 && n <= 75);
    }
    if (lat && lng) return { lat, lng };
    if (nums.length >= 2) {
        return { lat: nums[0] < 50 ? nums[0] : nums[1], lng: nums[0] > 50 ? nums[0] : nums[1] };
    }
  }
  return null;
}

async function fix(crmId) {
  const TOKEN = process.env.AMOCRM_TOKEN;
  const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';
  const res = await fetch(`https://${SUBDOMAIN}.amocrm.ru/api/v4/leads/${crmId}?with=custom_fields`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const lead = await res.json();
  const fields = lead.custom_fields_values || [];
  let coordStr = '';
  for (const f of fields) {
    const n = f.field_name.toLowerCase();
    if (n.includes('карт') || n.includes('xarita') || n.includes('координат')) {
      coordStr = f.values[0].value;
      break;
    }
  }
  
  console.log(`Lead ${crmId} (${lead.name}): Coord link: ${coordStr}`);
  const coords = await extractCoords(coordStr);
  if (coords) {
    console.log(`Extracted: ${coords.lat}, ${coords.lng}`);
    await prisma.house.update({
      where: { crmId },
      data: { lat: coords.lat, lng: coords.lng }
    });
    console.log('Fixed!');
  } else {
    console.log('Could not extract coordinates.');
  }
}

// Fix a few samples
async function run() {
  await fix('37517905'); // Novza
  await fix('37331623'); // Turkiston
  process.exit(0);
}
run();
