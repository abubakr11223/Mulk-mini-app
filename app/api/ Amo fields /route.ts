// app/api/amo-fields/route.ts
// FAQAT BIR MARTA ishlatiladi — field ID larni topish uchun
// Keyin bu faylni o'chirib yuborish mumkin

import { NextResponse } from 'next/server'

export async function GET() {
    const res = await fetch(
        `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/custom_fields`,
        { headers: { Authorization: `Bearer ${process.env.AMO_TOKEN}` } }
    )
    const data = await res.json()
    const fields = (data._embedded?.custom_fields || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
    }))
    return NextResponse.json(fields)
}