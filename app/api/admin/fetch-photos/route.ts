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
  const olx = text.match(/https:\/\/[a-z.]+\.olxcdn\.com\/[^\s"<>\n]+/gi) || []
  urls.push(...olx)
  const img = text.match(/https?:\/\/[^\s"<>\n]+\.(jpg|jpeg|png|webp)/gi) || []
  urls.push(...img)
  return [...new Set(urls)]
}

export async function GET(req: Request) {
  const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')
  if (!subdomain || !token) return NextResponse.json({ ok: false, error: 'No creds' })

  const url = new URL(req.url)
  const startPage = parseInt(url.searchParams.get('page') || '1')
  const batchSize = 20 // leads per request to avoid timeout

  try {
    // Lidlarni olish (bir sahifa)
    const leadsRes = await fetch(
      `https://${subdomain}.amocrm.ru/api/v4/leads?limit=${batchSize}&page=${startPage}&filter%5Bpipeline_id%5D=${PIPELINE_ID}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    const leadsData = await leadsRes.json()
    const leads: any[] = leadsData?._embedded?.leads || []

    if (leads.length === 0) {
      return NextResponse.json({ ok: true, done: true, processed: 0 })
    }

    let found = 0
    const cmds: any[][] = []

    for (const lead of leads) {
      const crmId = String(lead.id)

      // Notes/chat dan rasm URLlarini olish
      const notesRes = await fetch(
        `https://${subdomain}.amocrm.ru/api/v4/leads/${lead.id}/notes?limit=50`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      )
      const notesData = await notesRes.json()
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
    }

    if (cmds.length > 0) {
      await kvPipeline(cmds)
    }

    return NextResponse.json({
      ok: true,
      page: startPage,
      processed: leads.length,
      found,
      nextPage: leads.length === batchSize ? startPage + 1 : null,
      done: leads.length < batchSize,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
