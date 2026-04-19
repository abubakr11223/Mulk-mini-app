// ─────────────────────────────────────────────────────────────────────────────
// app/api/amo-webhook/route.ts
//
// amoCRM Webhook — lid yaratildi / o'zgartirildi / o'chirildi
// → cache'ni tozalaydi → keyingi GET /api/amo-leads yangi ma'lumot oladi
//
// amoCRM'da sozlash:
//   CRM → Sozlamalar → Webhooklar → URL:
//   https://YOUR_DOMAIN/api/amo-webhook
//   Hodisalar: Lead yaratildi, Lead o'zgartirildi, Lead o'chirildi
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { clearCache } from '@/lib/amo-cache'

// Ixtiyoriy: webhook'ni faqat amoCRM'dan kelganiga ishonch hosil qilish
// (amoCRM HMAC imzolashni qo'llab-quvvatlamaydi, shuning uchun secret token ishlatamiz)
const WEBHOOK_SECRET = process.env.AMOCRM_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  // Secret tekshirish (agar .env da AMOCRM_WEBHOOK_SECRET o'rnatilgan bo'lsa)
  if (WEBHOOK_SECRET) {
    const incoming = req.nextUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret') || ''
    if (incoming !== WEBHOOK_SECRET) {
      console.warn('⚠️  Webhook: noto\'g\'ri secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // amoCRM form-urlencoded yuboradi — ni o'qish (log uchun)
  let body = ''
  try { body = await req.text() } catch { }

  // Qaysi lid o'zgardi — logga yozamiz
  const params = new URLSearchParams(body)
  const leadId = params.get('leads[update][0][id]') ||
    params.get('leads[add][0][id]') ||
    params.get('leads[delete][0][id]') || 'unknown'

  console.log(`🔔 amoCRM Webhook: lid #${leadId} o'zgardi — cache tozalanmoqda`)

  // Cache'ni tozalaymiz — keyingi so'rovda amoCRM'dan yangi ma'lumot keladi
  clearCache()

  return NextResponse.json({
    ok: true,
    leadId,
    message: 'Cache tozalandi, keyingi so\'rovda yangi ma\'lumot yuklanadi',
  })
}

// amoCRM webhook URL'ni tekshirish uchun GET (ixtiyoriy)
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'amoCRM Webhook endpoint ishlayapti ✓',
  })
}
