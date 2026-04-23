import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 10

// ── Vercel KV (Upstash Redis REST API) ───────────────────────────────────────
const KV_URL   = (process.env.KV_REST_API_URL   || '').replace(/\/$/, '')
const KV_TOKEN = process.env.KV_REST_API_TOKEN   || ''

async function kvPipeline(commands: any[][]): Promise<any[]> {
  if (!KV_URL || !KV_TOKEN) return []
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
    })
    return await r.json()
  } catch { return [] }
}

async function kvGet(key: string): Promise<string | null> {
  const res = await kvPipeline([['get', key]])
  return res[0]?.result ?? null
}

async function kvSet(key: string, value: string, ex = 86400 * 30): Promise<void> {
  await kvPipeline([['set', key, value, 'EX', ex]])
}

// ── Photo helpers (atomic LIST approach — no race conditions) ─────────────────
// photolist:${crmId}  → Redis LIST of JSON strings  (RPUSH / LRANGE)
// photoids:${crmId}   → Redis SET  of file_unique_id (SADD — dedup)
// session:${senderId} → Redis STRING  (unchanged)

type PhotoEntry = { file_id: string; file_unique_id: string; date: string }

/** Read photos — new LIST format first, fallback to old JSON array */
async function getPhotos(crmId: string): Promise<PhotoEntry[]> {
  // New format: LRANGE
  const res = await kvPipeline([['lrange', `photolist:${crmId}`, 0, -1]])
  const list: string[] = res[0]?.result ?? []
  if (list.length > 0) {
    return list.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean) as PhotoEntry[]
  }
  // Fallback: old GET format
  const val = await kvGet(`photo:${crmId}`)
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

/**
 * Save photo atomically using SADD + RPUSH.
 * Returns { isDuplicate, total }
 * No race condition — Redis serialises each command.
 */
async function savePhotoAtomic(crmId: string, photo: PhotoEntry): Promise<{ isDuplicate: boolean; total: number }> {
  // SADD: returns 1 if new, 0 if already in set
  const saddRes = await kvPipeline([['sadd', `photoids:${crmId}`, photo.file_unique_id]])
  const added: number = saddRes[0]?.result ?? 0

  if (added === 0) {
    // Duplicate — just return current count
    const lenRes = await kvPipeline([['llen', `photolist:${crmId}`]])
    return { isDuplicate: true, total: lenRes[0]?.result ?? 0 }
  }

  // New photo — RPUSH (atomic append), returns new list length
  const rpushRes = await kvPipeline([['rpush', `photolist:${crmId}`, JSON.stringify(photo)]])
  const total: number = rpushRes[0]?.result ?? 1
  return { isDuplicate: false, total }
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendMsg(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

// ── Main webhook ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update.message || update.channel_post
    if (!msg) return NextResponse.json({ ok: true })

    const chatId   = msg.chat?.id as number | undefined
    const photos   = msg.photo as any[] | undefined
    const text     = (msg.text || '') as string
    const senderId = String(msg.from?.id || msg.chat?.id || '')

    // ── /start share_CRMID — hamma uchun (admin bo'lmasa ham) ────────────────
    const shareMatch = text.match(/^\/start share_(\d+)/)
    if (shareMatch && chatId) {
      const crmId = shareMatch[1]
      const photoList = await kvPipeline([['lrange', `photolist:${crmId}`, 0, -1]])
      const list: string[] = photoList[0]?.result ?? []
      let photos2: {file_id:string;file_unique_id:string}[] = []
      if (list.length > 0) {
        photos2 = list.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean) as any
      } else {
        const old = await kvPipeline([['get', `photo:${crmId}`]])
        const val = old[0]?.result
        if (val) try { photos2 = JSON.parse(val) } catch {}
      }

      const caption = [
        `🆔 CRM #${crmId}`,
        `📞 <b>+998 91 551 44 99</b>`,
      ].join('\n')

      if (photos2.length === 0) {
        await sendMsg(chatId, `🏠 CRM #${crmId}\n📞 <b>+998 91 551 44 99</b>`)
      } else if (photos2.length === 1) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: chatId, photo: photos2[0].file_id, caption, parse_mode: 'HTML' }),
        })
      } else {
        const media = photos2.slice(0,10).map((p,i) => ({
          type:'photo', media: p.file_id,
          ...(i===0 ? {caption, parse_mode:'HTML'} : {}),
        }))
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: chatId, media }),
        })
      }
      return NextResponse.json({ ok: true })
    }

    // Admin tekshiruv (rasm yuklash uchun)
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    if (adminIds.length > 0 && !adminIds.includes(senderId)) {
      if (chatId) await sendMsg(chatId, '⛔ Sizda rasm yuborish huquqi yoq.')
      return NextResponse.json({ ok: true })
    }

    // ── TEXT xabar ────────────────────────────────────────────────────────────
    if (!photos || photos.length === 0) {

      // /stats — to'liq statistika
      if (text.trim() === '/stats' || text.trim() === '/stats@mulkinvestbot') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://joyme-clone-abubakr11223s-projects.vercel.app'
          const statsRes = await fetch(`${appUrl}/api/analytics`, { cache: 'no-store' })
          const s = await statsRes.json()

          const today = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit' })

          const districtLines = (s.districts || [])
            .map((d: any, i: number) => `  ${i+1}. ${d.name || 'Noma\'lum'}: <b>${d.count}</b> marta`)
            .join('\n') || '  Ma\'lumot yo\'q'

          const topProps = (s.top_properties || [])
            .map((p: any, i: number) => `  ${i+1}. CRM #${p.id}: <b>${p.views}</b> ko\'rishlar`)
            .join('\n') || '  Ma\'lumot yo\'q'

          const msg = [
            `📊 <b>Mini App Statistikasi</b> (${today})`,
            ``,
            `👁 <b>Bugun:</b> ${s.today?.app_open ?? 0} ochilish | ${s.today?.property_view ?? 0} ko'rishlar`,
            `📅 <b>Kecha:</b> ${s.yesterday?.app_open ?? 0} ochilish`,
            ``,
            `👥 <b>Foydalanuvchilar:</b>`,
            `  • Jami unikal: <b>${s.users?.total ?? 0}</b>`,
            `  • Oxirgi 7 kun: <b>${s.users?.active_week ?? 0}</b>`,
            ``,
            `🏠 <b>Jami harakatlar:</b>`,
            `  • App ochildi: <b>${s.total?.app_open ?? 0}</b>`,
            `  • Kartochka ko'rildi: <b>${s.total?.property_view ?? 0}</b>`,
            `  • Foto ko'rildi: <b>${s.total?.photo_view ?? 0}</b>`,
            `  • Ulashildi: <b>${s.total?.share_click ?? 0}</b>`,
            `  • Sotuvchiga qo'ng'iroq: <b>${s.total?.call_click ?? 0}</b>`,
            `  • Filter ishlatildi: <b>${s.total?.filter_apply ?? 0}</b>`,
            ``,
            `📍 <b>Top tumanlar (filter bo'yicha):</b>`,
            districtLines,
            ``,
            `🔥 <b>Eng ko'p ko'rilgan ob'ektlar:</b>`,
            topProps,
            ``,
            `🗂 <b>Tab foydalanish:</b>`,
            `  • Galereya: ${s.tabs?.gallery ?? 0} | Xarita: ${s.tabs?.map ?? 0} | Filtr: ${s.tabs?.filter ?? 0}`,
          ].join('\n')

          if (chatId) await sendMsg(chatId, msg)
        } catch (e) {
          if (chatId) await sendMsg(chatId, '❌ Statistika olishda xato')
        }
        return NextResponse.json({ ok: true })
      }

      // /online — hozir mini appda nechta odam bor
      if (text.trim() === '/online' || text.trim() === '/online@mulkinvestbot') {
        const now = Date.now()
        const fiveMin = now - 5 * 60 * 1000
        const oneMin  = now - 1 * 60 * 1000

        const res = await kvPipeline([
          ['zremrangebyscore', 'online:users', '-inf', fiveMin],
          ['zcard', 'online:users'],
          ['zrangebyscore', 'online:users', oneMin, '+inf'],  // oxirgi 1 daqiqa
          ['zrangebyscore', 'online:users', fiveMin, '+inf'], // oxirgi 5 daqiqa
        ])
        const total5min: number = res[1]?.result ?? 0
        const last1min:  string[] = res[2]?.result ?? []
        const last5min:  string[] = res[3]?.result ?? []

        const timeStr = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' })

        if (chatId) await sendMsg(chatId,
          `📊 <b>Mini App — Online foydalanuvchilar</b>\n` +
          `🕐 Vaqt: ${timeStr} (Toshkent)\n\n` +
          `🟢 Oxirgi <b>1 daqiqa</b>: <b>${last1min.length}</b> ta\n` +
          `🔵 Oxirgi <b>5 daqiqa</b>: <b>${last5min.length}</b> ta\n\n` +
          `💡 Foydalanuvchi mini appni ochsa va har 30 sekundda ping bo'ladi`
        )
        return NextResponse.json({ ok: true })
      }

      // CRM ID o'rnatish
      const textMatch = text.match(/^#?(\d{5,9})\s*$/)
      if (textMatch && senderId) {
        const newCrmId = textMatch[1]
        await kvSet(`session:${senderId}`, newCrmId, 300)
        const existing = await getPhotos(newCrmId)
        if (chatId) await sendMsg(chatId,
          `✅ Session ochildi: CRM <b>#${newCrmId}</b>\n` +
          `📸 Hozir ${existing.length} ta rasm bor\n` +
          `⚡ Endi rasmlarni yuboring (5 daqiqa ichida)`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── PHOTO xabar ───────────────────────────────────────────────────────────
    const caption = (msg.caption || '') as string
    const photo   = photos[photos.length - 1]   // eng katta o'lcham
    const photoData: PhotoEntry = {
      file_id:        photo.file_id,
      file_unique_id: photo.file_unique_id,
      date: new Date((msg.date as number) * 1000).toISOString().split('T')[0],
    }

    const captionMatch = caption.match(/#?(\d{5,9})\b/)

    // CRM ID: 1) caption, 2) session
    let crmId: string | null = captionMatch ? captionMatch[1] : null
    const isFromCaption = !!captionMatch
    if (!crmId && senderId) crmId = await kvGet(`session:${senderId}`)

    if (!crmId) {
      if (chatId) await sendMsg(chatId,
        '❌ CRM ID topilmadi.\n\nID yuborish usullari:\n' +
        '1️⃣ Rasmga caption: <code>#38042635</code>\n' +
        '2️⃣ Yoki avval ID yozing: <code>38042635</code>\n   Keyin rasmlarni yuboring')
      return NextResponse.json({ ok: true })
    }

    // Agar caption/text orqali YANGI ID berilgan bo'lsa va allaqachon rasmlar mavjud bo'lsa — qabul qilmasin
    if (isFromCaption) {
      const existing = await getPhotos(crmId)
      if (existing.length > 0) {
        if (chatId) await sendMsg(chatId,
          `⚠️ CRM <b>#${crmId}</b> uchun mini appda allaqachon <b>${existing.length} ta rasm</b> mavjud.\n` +
          `📵 Yangi rasmlar qabul qilinmadi.`)
        return NextResponse.json({ ok: true })
      }
    }

    // Session yangilash (5 daqiqa)
    if (senderId) await kvSet(`session:${senderId}`, crmId, 300)

    // ── Atomik saqlash ────────────────────────────────────────────────────────
    const { isDuplicate, total } = await savePhotoAtomic(crmId, photoData)

    // Birinchi (caption li) rasmda yoki har 5 ta rasmda xabar
    if (!isDuplicate && (isFromCaption || total % 5 === 0)) {
      if (chatId) await sendMsg(chatId,
        `${total === 1 ? '✅' : '➕'} CRM <b>#${crmId}</b>\n` +
        `📸 ${total} ta rasm saqlandi`)
    }

    console.log(`Photo ${isDuplicate ? 'DUPLICATE' : 'saved'}: CRM #${crmId} total=${total} sender=${senderId}`)
  } catch (e) {
    console.error('tg-webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram photo webhook active (atomic LIST)',
    kv: KV_URL ? '✅ connected' : '❌ not configured',
  })
}
