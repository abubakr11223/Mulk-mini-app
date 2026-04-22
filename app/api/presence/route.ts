import { NextRequest, NextResponse } from 'next/server'
const KV_URL = (process.env.KV_REST_API_URL || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN || ''
async function kv(c: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try { const r = await fetch(KV_URL+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+KV_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(c),cache:'no-store'}); return await r.json() } catch { return [] }
}
export async function POST(req: NextRequest) {
  try {
    const { userId, username } = await req.json()
    if (!userId) return NextResponse.json({ ok: false })
    const now = Date.now()
    await kv([['zadd','online:users',now,String(userId)],['zremrangebyscore','online:users','-inf',now-300000],['set','online:user:'+userId,JSON.stringify({username,lastSeen:now}),'EX',300]])
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ ok: false }) }
}
