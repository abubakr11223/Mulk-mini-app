import { NextResponse } from 'next/server'

// ── Vercel KV (Upstash Redis REST) ────────────────────────────────────────────
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

// ── GET /api/online-count ─────────────────────────────────────────────────────
// Hozir online bo'lgan foydalanuvchilar soni (oxirgi 5 daqiqada active)
export async function GET() {
  try {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    // Eski yozuvlarni tozalab, keyin count olish
    const results = await kvPipeline([
      ['zremrangebyscore', 'online:users', '-inf', fiveMinutesAgo],
      ['zcard', 'online:users'],
      // Barcha online userIdlarni ham qaytaramiz (admin uchun)
      ['zrangebyscore', 'online:users', fiveMinutesAgo, '+inf'],
    ])

    const count: number = results[1]?.result ?? 0
    const userIds: string[] = results[2]?.result ?? []

    return NextResponse.json({
      ok: true,
      online: count,
      userIds,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
