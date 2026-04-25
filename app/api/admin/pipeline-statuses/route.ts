import { NextResponse } from 'next/server'
import https from 'https'

const PIPELINE_ID = 10775902

function httpsGet(host: string, path: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get({ hostname: host, path, headers: { Authorization: `Bearer ${token}` } },
      (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)) }
    ).on('error', reject)
  })
}

export async function GET() {
  const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
  const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')

  const raw = await httpsGet(`${subdomain}.amocrm.ru`,
    `/api/v4/leads/pipelines/${PIPELINE_ID}?with=statuses`, token)
  const data = JSON.parse(raw)
  const statuses = data._embedded?.statuses || []

  return NextResponse.json({
    ok: true,
    statuses: statuses.map((s: any) => ({ id: s.id, name: s.name, type: s.type }))
  })
}
