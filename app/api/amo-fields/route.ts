import { NextResponse } from 'next/server'

export async function GET() {
    const subdomain = process.env.AMOCRM_SUBDOMAIN
    const token = process.env.AMOCRM_TOKEN

    const res = await fetch(
        `https://${subdomain}.amocrm.ru/api/v4/leads/custom_fields`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    const fields = (data._embedded?.custom_fields || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
    }))
    return NextResponse.json(fields)
}