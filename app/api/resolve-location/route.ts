import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'url kerak' }, { status: 400 })

    try {
        // Yandex qisqa havolani kuzatib boramiz
        const response = await fetch(url, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const finalUrl = response.url

        // 1. ?ll=lng,lat  (Yandex asosiy format)
        const urlObj = new URL(finalUrl)
        const ll = urlObj.searchParams.get('ll')
        if (ll) {
            const [lng, lat] = ll.split(',').map(Number)
            if (!isNaN(lat) && !isNaN(lng)) {
                return NextResponse.json({ lat, lng, source: 'll' })
            }
        }

        // 2. ?pt=lng,lat  (pin format)
        const pt = urlObj.searchParams.get('pt')
        if (pt) {
            const [lng, lat] = pt.split(',').map(Number)
            if (!isNaN(lat) && !isNaN(lng)) {
                return NextResponse.json({ lat, lng, source: 'pt' })
            }
        }

        // 3. URL path ichida koordinata: /@lat,lng yoki /lat,lng
        const coordMatch = finalUrl.match(/[/@](-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1])
            const lng = parseFloat(coordMatch[2])
            return NextResponse.json({ lat, lng, source: 'path' })
        }

        return NextResponse.json({ error: 'koordinata topilmadi', finalUrl }, { status: 404 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}