import { NextRequest, NextResponse } from 'next/server'

const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kv(commands: any[][]): Promise<any[]> {
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

// ── Event turlari ─────────────────────────────────────────────────────────────
// app_open       — app ochildi
// property_view  — kartochka ochildi (data: { crmId })
// tab_switch     — tab almashdi (data: { tab })
// filter_apply   — filter qo'llandi (data: { district, type, ... })
// search         — qidiruv (data: { query })
// photo_view     — to'liq ekran foto (data: { crmId })
// share_click    — ulashish bosildi (data: { crmId })
// call_click     — sotuvchi bosildi (data: { crmId })

// ── POST /api/analytics ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { event, userId, data = {} } = await req.json()
    if (!event) return NextResponse.json({ ok: false })

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const now   = Date.now()
    const cmds: any[][] = []

    // 1. Jami event soni
    cmds.push(['incr', `stats:event:${event}`])
    // 2. Kunlik event soni (90 kun saqlanadi)
    cmds.push(['incr', `stats:daily:${today}:${event}`])
    cmds.push(['expire', `stats:daily:${today}:${event}`, 60 * 60 * 24 * 90])

    // 3. Unikal foydalanuvchilar (ZADD — takrorlanmaydi, score=lastSeen)
    if (userId) {
      cmds.push(['zadd', 'stats:users', now, String(userId)])
      // Sessiya soni (har app_open da oshadi)
      if (event === 'app_open') {
        cmds.push(['incr', `stats:user:${userId}:sessions`])
        cmds.push(['set',  `stats:user:${userId}:last_seen`, now, 'EX', 60 * 60 * 24 * 90])
      }
    }

    // 4. Maxsus eventlar uchun qo'shimcha statistika
    if (event === 'filter_apply' && data.district) {
      cmds.push(['incr', `stats:district:${data.district}`])
    }
    if (event === 'filter_apply' && data.type && data.type !== 'all') {
      cmds.push(['incr', `stats:filter_type:${data.type}`])
    }
    if (event === 'property_view' && data.crmId) {
      cmds.push(['incr', `stats:property:${data.crmId}:views`])
      cmds.push(['zadd', 'stats:top_properties', 'INCR', 1, String(data.crmId)])
    }
    if (event === 'tab_switch' && data.tab) {
      cmds.push(['incr', `stats:tab:${data.tab}`])
    }

    await kv(cmds)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// ── GET /api/analytics ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const today     = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const weekAgo   = Date.now() - 7 * 86400000

    const res = await kv([
      // Jami eventlar
      ['get', 'stats:event:app_open'],
      ['get', 'stats:event:property_view'],
      ['get', 'stats:event:share_click'],
      ['get', 'stats:event:call_click'],
      ['get', 'stats:event:photo_view'],
      ['get', 'stats:event:filter_apply'],
      // Bugungi
      ['get', `stats:daily:${today}:app_open`],
      ['get', `stats:daily:${today}:property_view`],
      // Kechagi
      ['get', `stats:daily:${yesterday}:app_open`],
      // Unikal foydalanuvchilar jami
      ['zcard', 'stats:users'],
      // Oxirgi 7 kunda active
      ['zcount', 'stats:users', weekAgo, '+inf'],
      // Top 5 tuman
      ['keys', 'stats:district:*'],
      // Top ko'rilgan kartochkalar
      ['zrevrange', 'stats:top_properties', 0, 4, 'WITHSCORES'],
      // Tab statistika
      ['get', 'stats:tab:map'],
      ['get', 'stats:tab:gallery'],
      ['get', 'stats:tab:filter'],
    ])

    // Tumanlar
    const districtKeys: string[] = res[11]?.result ?? []
    let districts: { name: string; count: number }[] = []
    if (districtKeys.length > 0) {
      const dRes = await kv(districtKeys.map(k => ['get', k]))
      districts = districtKeys.map((k, i) => ({
        name: k.replace('stats:district:', ''),
        count: parseInt(dRes[i]?.result || '0'),
      })).sort((a, b) => b.count - a.count).slice(0, 8)
    }

    return NextResponse.json({
      ok: true,
      total: {
        app_open:       parseInt(res[0]?.result  || '0'),
        property_view:  parseInt(res[1]?.result  || '0'),
        share_click:    parseInt(res[2]?.result  || '0'),
        call_click:     parseInt(res[3]?.result  || '0'),
        photo_view:     parseInt(res[4]?.result  || '0'),
        filter_apply:   parseInt(res[5]?.result  || '0'),
      },
      today: {
        app_open:      parseInt(res[6]?.result  || '0'),
        property_view: parseInt(res[7]?.result  || '0'),
      },
      yesterday: {
        app_open:      parseInt(res[8]?.result  || '0'),
      },
      users: {
        total:        parseInt(res[9]?.result  || '0'),
        active_week:  parseInt(res[10]?.result || '0'),
      },
      districts,
      top_properties: (res[12]?.result as string[] ?? []).reduce((acc: {id:string;views:number}[], v, i, arr) => {
        if (i % 2 === 0) acc.push({ id: v, views: parseInt(arr[i+1] || '0') })
        return acc
      }, []),
      tabs: {
        map:     parseInt(res[13]?.result || '0'),
        gallery: parseInt(res[14]?.result || '0'),
        filter:  parseInt(res[15]?.result || '0'),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
