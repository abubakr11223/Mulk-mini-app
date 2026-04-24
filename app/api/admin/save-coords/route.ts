import { NextRequest, NextResponse } from 'next/server'

const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands), cache: 'no-store',
    })
    return await r.json()
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  try {
    const { coords } = await req.json()
    if (!coords || typeof coords !== 'object') {
      return NextResponse.json({ ok: false, error: 'coords kerak' })
    }

    // Redis ga saqlash: coords:{crmId} = {lat, lng}
    const cmds = Object.entries(coords).map(([id, c]: [string, any]) => [
      'set', `coords:${id}`, JSON.stringify({ lat: c.lat, lng: c.lng }), 'EX', 60*60*24*365
    ])

    if (cmds.length > 0) {
      await kvPipeline(cmds)
      // Cache tozalash
      await kvPipeline([['del', 'cache:amo-leads']])
    }

    return NextResponse.json({ ok: true, saved: cmds.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
