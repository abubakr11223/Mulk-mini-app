import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    const now        = Date.now()
    const fiveMinAgo = now - 5 * 60 * 1000

    const results = await kvPipeline([
      ['zremrangebyscore', 'online:users', '-inf', fiveMinAgo],
      ['zcard', 'online:users'],
      ['zrangebyscore', 'online:users', fiveMinAgo, '+inf'],
    ])

    const count: number     = results[1]?.result ?? 0
    const userIds: string[] = results[2]?.result ?? []

    // Admin panel uchun: har bir user username + lastSeen
    let users: { id: string; username: string; lastSeen: number }[] = []
    if (userIds.length > 0) {
      const detailRes = await kvPipeline(userIds.map(id => ['get', `online:user:${id}`]))
      users = userIds.map((id, i) => {
        try {
          const d = JSON.parse(detailRes[i]?.result || '{}')
          return { id, username: d.username || 'Noma\'lum', lastSeen: d.lastSeen || 0 }
        } catch {
          return { id, username: 'Noma\'lum', lastSeen: 0 }
        }
      }).sort((a, b) => b.lastSeen - a.lastSeen)
    }

    return NextResponse.json({ ok: true, online: count, userIds, users, timestamp: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
