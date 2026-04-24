import { NextResponse } from 'next/server'

const PIPELINE_ID = 10512362  // КВАРТИРЫ - ГЛАВНАЯ

export async function GET() {
  try {
    const subdomain = (process.env.AMOCRM_SUBDOMAIN || '').replace(/"/g, '')
    const token = (process.env.AMOCRM_TOKEN || '').replace(/"/g, '')
    if (!subdomain || !token) return NextResponse.json({ ok: false, error: 'No credentials' })

    // 1. Pipeline statuses ni olish
    const pipeRes = await fetch(
      `https://${subdomain}.amocrm.ru/api/v4/leads/pipelines/${PIPELINE_ID}?with=statuses`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    const pipeData = await pipeRes.json()
    const statuses = pipeData._embedded?.statuses || []

    // "СВЯЗАЛСЯ" status ID ni topish
    const svStatus = statuses.find((s: any) =>
      s.name?.toLowerCase().includes('связался') ||
      s.name?.toLowerCase().includes('svizalsya')
    )

    if (!svStatus) {
      return NextResponse.json({
        ok: false,
        error: 'СВЯЗАЛСЯ topilmadi',
        statuses: statuses.map((s: any) => ({ id: s.id, name: s.name }))
      })
    }

    const statusId = svStatus.id

    // 2. Koordinatasiz uylarni olish (URL yo'q yoki noto'g'ri)
    const badLeads: number[] = [
      37014946, 37176840, 37223257, 37344941, 37375295, 37423965, 37456661,
      35854638, 35909354, 35925118, 35944300, 35957550, 36010959, 36102261,
      36114441, 36281565, 36339233, 34092683, 34113983, 34147687, 34253227,
      34586063, 34981553, 35445123, 35460249, 35532557, 35578965, 35588705,
      35632386, 35650166, 35651178, 35660294, 35713734, 35727740, 35761132,
      35848452, 35818384, 33906889, 36159575
    ]

    // 3. Har birini СВЯЗАЛСЯ ga ko'chirish (batch 5 ta)
    let moved = 0
    for (let i = 0; i < badLeads.length; i += 5) {
      const batch = badLeads.slice(i, i + 5)
      const body = batch.map(id => ({
        id,
        pipeline_id: PIPELINE_ID,
        status_id: statusId,
      }))

      const res = await fetch(`https://${subdomain}.amocrm.ru/api/v4/leads`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) moved += batch.length
    }

    return NextResponse.json({
      ok: true,
      moved,
      statusId,
      statusName: svStatus.name,
      total: badLeads.length,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
