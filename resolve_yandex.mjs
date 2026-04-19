import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// .env dan token olish
const env = readFileSync('.env', 'utf8');
const token = env.match(/AMOCRM_TOKEN="?([^"\n]+)"?/)[1];

// CRM dan Yandex URL larni olish
const res = await fetch(
  'https://mulk.amocrm.ru/api/v4/leads?limit=250&filter%5Bpipeline_id%5D=10775902&with=custom_fields_values',
  { headers: { Authorization: 'Bearer ' + token } }
);
const data = await res.json();
const leads = data._embedded.leads;

const yandexLeads = [];
for (const l of leads) {
  const fields = l.custom_fields_values || [];
  const url = fields.find(f => f.field_id === 1461194)?.values?.[0]?.value;
  if (url && url.includes('yandex')) {
    yandexLeads.push({ id: l.id, url });
  }
}
console.log('Yandex URL lar:', yandexLeads.length);

// Playwright bilan resolve
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const cache = {};
for (let i = 0; i < yandexLeads.length; i++) {
  const { id, url } = yandexLeads[i];
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const finalUrl = page.url();
    const m = finalUrl.match(/ll=([0-9.]+)%2C([0-9.]+)/) || finalUrl.match(/ll=([0-9.]+),([0-9.]+)/);
    if (m) {
      cache[id] = { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
      console.log(`${i+1}/${yandexLeads.length} ${id} -> OK`);
    } else {
      console.log(`${i+1}/${yandexLeads.length} ${id} -> URL: ${finalUrl.slice(0, 80)}`);
    }
  } catch (e) {
    console.log(`${i+1}/${yandexLeads.length} ${id} -> ERROR: ${e.message.slice(0, 50)}`);
  }
  await page.waitForTimeout(500);
}

await browser.close();
writeFileSync('public/coords_cache.json', JSON.stringify(cache, null, 2));
console.log('\nSaqlandi:', Object.keys(cache).length, 'ta');
