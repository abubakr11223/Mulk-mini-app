// amocrm-sync.js
// amoCRM dan barcha lidlarni location bilan sinxronlash

const AMO_SUBDOMAIN = process.env.AMO_SUBDOMAIN   // .env dan
const AMO_TOKEN = process.env.AMO_TOKEN        // .env dan

// amoCRM da "Адрес Я.Карта" field ID sini topish
async function getYandexFieldId() {
  const res = await fetch(
    `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/custom_fields`,
    { headers: { Authorization: `Bearer ${AMO_TOKEN}` } }
  )
  const data = await res.json()
  const fields = data._embedded?.custom_fields || []

  // Field nomini qidirish (Yandex, карта, адрес)
  const yandexField = fields.find(f =>
    f.name?.toLowerCase().includes('яндекс') ||
    f.name?.toLowerCase().includes('карта') ||
    f.name?.toLowerCase().includes('адрес') ||
    f.name?.toLowerCase().includes('yandex')
  )

  if (!yandexField) {
    console.log('Mavjud fieldlar:')
    fields.forEach(f => console.log(`  ID: ${f.id}  Nomi: ${f.name}`))
    throw new Error('Yandex Maps field topilmadi! Yuqoridagi ID lardan to\'g\'risini tanlang')
  }

  console.log(`✅ Field topildi: "${yandexField.name}" — ID: ${yandexField.id}`)
  return yandexField.id
}

// Barcha lidlarni sahifalab olish
async function fetchAllLeads(fieldId) {
  let page = 1
  const allLeads = []

  while (true) {
    const res = await fetch(
      `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?limit=250&page=${page}&with=custom_fields`,
      { headers: { Authorization: `Bearer ${AMO_TOKEN}` } }
    )
    const data = await res.json()
    const leads = data._embedded?.leads || []
    if (leads.length === 0) break
    allLeads.push(...leads)
    console.log(`  Sahifa ${page}: ${leads.length} ta lid`)
    page++
  }

  console.log(`📋 Jami: ${allLeads.length} ta lid`)
  return allLeads
}

// Yandex qisqa havoladan koordinata olish
async function resolveYandexUrl(yandexUrl) {
  try {
    // To'g'ridan-to'g'ri fetch — koordinata parse
    const response = await fetch(yandexUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const finalUrl = response.url
    const urlObj = new URL(finalUrl)

    // ll param: "lng,lat"
    const ll = urlObj.searchParams.get('ll')
    if (ll) {
      const [lng, lat] = ll.split(',').map(Number)
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng }
      }
    }

    // pt param
    const pt = urlObj.searchParams.get('pt')
    if (pt) {
      const [lng, lat] = pt.split(',').map(Number)
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }

    // Path ichida
    const m = finalUrl.match(/[/@](-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

    return null
  } catch {
    return null
  }
}

// Asosiy funksiya — barcha lidlarni o'tkazish
export async function syncLeadsFromAmo() {
  console.log('🚀 amoCRM sinxronlash boshlandi...')

  const fieldId = await getYandexFieldId()
  const leads = await fetchAllLeads(fieldId)

  const results = []
  let successCount = 0
  let failCount = 0
  let noLocationCount = 0

  for (const lead of leads) {
    const fields = lead.custom_fields_values || []
    const yandexFld = fields.find(f => f.field_id == fieldId)
    const yandexUrl = yandexFld?.values?.[0]?.value

    if (!yandexUrl || !yandexUrl.includes('yandex')) {
      noLocationCount++
      results.push({ id: lead.id, name: lead.name, status: 'no_location' })
      continue
    }

    const coords = await resolveYandexUrl(yandexUrl)

    if (!coords) {
      failCount++
      console.warn(`  ❌ ${lead.id} — "${lead.name}" — koordinata topilmadi: ${yandexUrl}`)
      results.push({ id: lead.id, name: lead.name, status: 'failed', url: yandexUrl })
      continue
    }

    successCount++
    results.push({
      id: lead.id,
      name: lead.name,
      lat: coords.lat,
      lng: coords.lng,
      yandex_url: yandexUrl,
      status: 'success'
    })

    // Rate limit — har 5 ta liddan keyin biroz kutish
    if (successCount % 5 === 0) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  console.log(`\n📊 Natija:`)
  console.log(`  ✅ Muvaffaqiyatli: ${successCount}`)
  console.log(`  ❌ Xato:           ${failCount}`)
  console.log(`  ⏭  Location yo'q:  ${noLocationCount}`)

  // Faqat muvaffaqiyatli leadlarni qaytarish
  return results.filter(r => r.status === 'success')
}