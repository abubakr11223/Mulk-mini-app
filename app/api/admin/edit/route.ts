import { NextRequest, NextResponse } from 'next/server'

const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
    })
    return await r.json()
  } catch { return [] }
}

// ── POST /api/admin/edit — uyni tahrirlash ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { crmId, hidden, isTop, priceOverride, titleOverride } = await req.json()
    if (!crmId) return NextResponse.json({ ok: false, error: 'crmId kerak' })

    const key = `admin:edit:${crmId}`
    // Mavjud ma'lumotni olamiz
    const existing = await kvPipeline([['get', key]])
    let data: any = {}
    try { data = JSON.parse(existing[0]?.result || '{}') } catch {}

    // Yangilaymiz
    if (hidden !== undefined) data.hidden = hidden
    if (isTop !== undefined) data.isTop = isTop
    if (priceOverride !== undefined) data.priceOverride = priceOverride
    if (titleOverride !== undefined) data.titleOverride = titleOverride
    data.updatedAt = Date.now()

    await kvPipeline([['set', key, JSON.stringify(data), 'EX', 60 * 60 * 24 * 365]])

    // Cache ni tozalaymiz (yangi ma'lumot yuklansin)
    await kvPipeline([['del', 'cache:amo-leads']])

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── GET /api/admin/edit?crmId=XXX — tahrir ma'lumotini olish ─────────────────
export async function GET(req: NextRequest) {
  try {
    const crmId = new URL(req.url).searchParams.get('crmId')
    if (!crmId) return NextResponse.json({ ok: false })
    const res = await kvPipeline([['get', `admin:edit:${crmId}`]])
    const data = JSON.parse(res[0]?.result || '{}')
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
