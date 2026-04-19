import { NextResponse } from 'next/server'
import https from 'https'

const PIPELINE_ID = 10775902
const FIELD_YANDEX_URL = 1461194

function getField(fields: any[], id: number): string {
  const f = fields.find((f: any) => f.field_id === id)
  return f?.values?.[0]?.value ?? ''
}

function httpsGet(host: string, path: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get({ hostname: host, path, headers: { Authorization: 'Bearer ' + token } }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => resolve(d))
    }).on('error', reject)
  })
}

export async function GET() {
  const s = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const t = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')

  const all: any[] = []
  let page = 1
  while (page <= 20) {
    const path = `/api/v4/leads?limit=250&page=${page}&filter%5Bpipeline_id%5D=${PIPELINE_ID}&with=custom_fields_values`
    const text = await httpsGet(s + '.amocrm.ru', path, t)
    let data: any
    try { data = JSON.parse(text) } catch { break }
    const leads = data?._embedded?.leads ?? []
    if (leads.length === 0) break
    all.push(...leads)
    page++
  }

  const noUrl: any[] = []
  const hasUrl: any[] = []

  for (const lead of all) {
    const fields = lead.custom_fields_values || []
    const url = getField(fields, FIELD_YANDEX_URL)
    if (!url) {
      noUrl.push({ id: lead.id, name: lead.name })
    } else {
      hasUrl.push({ id: lead.id, name: lead.name, url })
    }
  }

  return NextResponse.json({
    total: all.length,
    hasUrl: hasUrl.length,
    noUrl: noUrl.length,
    sampleUrls: hasUrl.slice(0, 20).map(h => h.url),
    noUrlSample: noUrl.slice(0, 10),
  })
}
