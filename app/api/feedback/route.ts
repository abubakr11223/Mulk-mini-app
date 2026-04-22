import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, username, message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ ok: false, error: 'No message' })

    const token    = process.env.TELEGRAM_BOT_TOKEN
    const adminIds = (process.env.ADMIN_IDS || '8546867911').split(',').map(s => s.trim()).filter(Boolean)

    if (!token) return NextResponse.json({ ok: false, error: 'No token' })

    const text =
      `💬 <b>Yangi savol / xabar</b>\n\n` +
      `👤 <b>${username || 'Noma\'lum'}</b> (ID: <code>${userId || '?'}</code>)\n\n` +
      `📝 ${message}`

    await Promise.all(adminIds.map(adminId =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminId, text, parse_mode: 'HTML' }),
      })
    ))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
