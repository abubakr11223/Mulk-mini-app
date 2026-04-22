import { NextResponse } from 'next/server'
const KV_URL = (process.env.KV_REST_API_URL || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN || ''
async function kv(c: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try { const r = await fetch(KV_URL+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+KV_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(c),cache:'no-store'}); return await r.json() } catch { return [] }
}
export async function GET() {
  try {
    const now = Date.now()
    const res = await kv([['zremrangebyscore','online:users','-inf',now-300000],['zcard','online:users']])
    return NextResponse.json({ ok: true, online: res[1]?.result ?? 0 })
  } catch { return NextResponse.json({ ok: false, online: 0 }) }
}
