import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, username, message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ ok: false, error: 'No message' })

    const token    = process.env.TELEGRAM_BOT_TOKEN
    const adminIds = (process.env.ADMIN_IDS || '8546867911').split(',').map(s => s.trim()).filter(Boolean)

    if (!token) return NextResponse.json({ ok: false, error: 'No token' })

    const isAnon = String(userId).startsWith('anon_')
    const userLine = isAnon
      ? `👤 <b>Anonim foydalanuvchi</b>`
      : username && username !== 'unknown'
        ? `👤 <a href="tg://user?id=${userId}">@${username}</a> (ID: <code>${userId}</code>)`
        : `👤 <a href="tg://user?id=${userId}">Foydalanuvchi</a> (ID: <code>${userId}</code>)`

    const text =
      `💬 <b>Yangi savol / xabar</b>\n\n` +
      `${userLine}\n\n` +
      `📝 ${message}\n\n` +
      (isAnon ? '' : `💌 Javob berish: <a href="tg://user?id=${userId}">shu yerga bosing</a>`)

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
