import { NextRequest, NextResponse } from 'next/server'

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

// ── POST /api/presence ────────────────────────────────────────────────────────
// Client har 30 sekundda shu endpoint ga userId jo'natadi
// Redis ZADD bilan saqlanadi, score = Unix timestamp (ms)
// 5 daqiqadan eski yozuvlar tozalanadi → "5 daqiqa ichida active"
export async function POST(req: NextRequest) {
  try {
    const { userId, username } = await req.json()
    if (!userId) return NextResponse.json({ ok: false, error: 'No userId' })

    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    // ZADD online:users score=timestamp member=userId
    // ZREMRANGEBYSCORE — 5 daqiqadan eski yozuvlarni o'chirish
    await kvPipeline([
      ['zadd', 'online:users', now, String(userId)],
      ['zremrangebyscore', 'online:users', '-inf', fiveMinutesAgo],
      // Qo'shimcha: username ni saqlaymiz (optional)
      ['set', `online:user:${userId}`, JSON.stringify({ username, lastSeen: now }), 'EX', 300],
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
