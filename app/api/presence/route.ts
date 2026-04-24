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

const EXPIRY = 90 // sekund — 90s ichida ping bo'lmasa offline

// ── POST /api/presence — foydalanuvchi online ─────────────────────────────────
function parseInitDataUser(initData: string): { id?: number; username?: string; first_name?: string } | null {
  try {
    if (!initData) return null
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(decodeURIComponent(userStr))
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    let { userId, username, initData } = await req.json()

    // initData dan real user ID olish
    if (initData) {
      const parsedUser = parseInitDataUser(initData)
      if (parsedUser?.id) {
        userId = String(parsedUser.id)
        username = parsedUser.username || parsedUser.first_name || username
      }
    }

    // Debug: initData ni saqlash
    if (initData) {
      await kvPipeline([['set', 'debug:last_initdata', initData, 'EX', 300]])
    } else {
      await kvPipeline([['set', 'debug:last_initdata', 'EMPTY_' + (userId||'null'), 'EX', 300]])
    }

    if (!userId) return NextResponse.json({ ok: false, error: 'No userId' })

    const now    = Date.now()
    const cutoff = now - EXPIRY * 1000

    await kvPipeline([
      ['zadd', 'online:users', now, String(userId)],
      ['zremrangebyscore', 'online:users', '-inf', cutoff],
      ['set', `online:user:${userId}`, JSON.stringify({ username, lastSeen: now }), 'EX', EXPIRY],
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── DELETE /api/presence — foydalanuvchi chiqdi ───────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ ok: false })

    await kvPipeline([
      ['zrem', 'online:users', String(userId)],
      ['del', `online:user:${userId}`],
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
