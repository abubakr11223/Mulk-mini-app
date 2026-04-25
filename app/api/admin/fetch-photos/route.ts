import { NextResponse } from 'next/server'

const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''
const PIPELINE_ID = 10775902

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  const r = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands), cache: 'no-store',
  })
  return r.json()
}

function extractImageUrls(text: string): string[] {
  if (!text) return []
  const urls: string[] = []
  // OLX CDN linklar — port (:443) bilan ham
  const olx = text.match(/https:\/\/[a-z.]+\.olxcdn\.com(?::\d+)?\/[^\s"<>\n,]+/gi) || []
  urls.push(...olx.map(u => u.replace(/[;,]s=\d+x\d+$/, ''))) // clean size suffix

  // Boshqa rasm linklar
  const img = text.match(/https?:\/\/[^\s"<>\n]+\.(jpg|jpeg|png|webp)/gi) || []
  urls.push(...img)

  return [...new Set(urls)].filter(u => u.length > 20)
}

export async function GET(req: Request) {
  const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')
  if (!subdomain || !token) return NextResponse.json({ ok: false, error: 'No creds' })

  const url = new URL(req.url)
  const startPage = parseInt(url.searchParams.get('page') || '1')
  const batchSize = 20 // leads per request to avoid timeout

  try {
    // Redis cache dan lead ID larini olish
    // Debug mode - bitta lid noteslarini ko'rish
    const debugId = url.searchParams.get('debug')
    if (debugId) {
      const https2 = await import('https')
      const debugGet = (path_: string): Promise<string> => new Promise((resolve, reject) => {
        https2.get({ hostname: `${subdomain}.amocrm.ru`, path: path_, headers: { Authorization: `Bearer ${token}` } },
          (r: any) => { let d=''; r.on('data',(c:any)=>d+=c); r.on('end',()=>resolve(d)) }
        ).on('error', reject)
      })
      const raw = await debugGet(`/api/v4/leads/${debugId}/notes?limit=10`)
      return NextResponse.json({ ok: true, debug: true, raw: raw.substring(0, 2000) })
    }

    const cacheRes = await kvPipeline([['get', 'cache:amo-leads']])
    const allHouses: any[] = JSON.parse(cacheRes[0]?.result || '[]')
    if (!allHouses.length) return NextResponse.json({ ok: false, error: 'Cache bo\'sh. Avval amo-leads?force=1 qiling' })

    // Batch bo'lib ishlash
    const start = (startPage - 1) * batchSize
    const leads = allHouses.slice(start, start + batchSize).map(h => ({ id: h.id }))

    // https module bilan notes fetch
    const https = await import('https')
    const httpsGet = (path_: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        https.get({ hostname: `${subdomain}.amocrm.ru`, path: path_, headers: { Authorization: `Bearer ${token}` } },
          (r: any) => { let d=''; r.on('data',(c:any)=>d+=c); r.on('end',()=>resolve(d)) }
        ).on('error', reject)
      })
    }

    if (leads.length === 0) {
      return NextResponse.json({ ok: true, done: true, processed: 0 })
    }

    let found = 0
    const cmds: any[][] = []

    for (const lead of leads) {
      const crmId = String(lead.id)

      // Notes/chat dan rasm URLlarini olish
      try {
        const notesRaw = await httpsGet(`/api/v4/leads/${lead.id}/notes?limit=50`)
        const notesData = JSON.parse(notesRaw)
        const notes: any[] = notesData?._embedded?.notes || []

      const allUrls: string[] = []
      for (const note of notes) {
        const text = note.params?.text || ''
        allUrls.push(...extractImageUrls(text))
      }

        if (allUrls.length > 0) {
          cmds.push(['set', `photo_urls:${crmId}`, JSON.stringify([...new Set(allUrls)]), 'EX', 60*60*24*365])
          found++
        }
      } catch {} // skip failed notes
    }

    if (cmds.length > 0) {
      await kvPipeline(cmds)
    }

    const total = allHouses.length
    const done = start + leads.length >= total

    return NextResponse.json({
      ok: true,
      page: startPage,
      processed: leads.length,
      found,
      total,
      nextPage: done ? null : startPage + 1,
      done,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
