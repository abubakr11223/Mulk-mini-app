import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { chatId, house } = await req.json()

    if (!chatId || !house) {
      return NextResponse.json({ error: 'Missing chatId or house data' }, { status: 400 })
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
       return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
    }

    const priceFormatted = house.price ? house.price.replace('$', '').trim() : '-';

    const landmarkLine = house.landmark ? `📍 Ориентир: ${house.landmark}\n` : '';
    const districtLine = house.district ? `📍 Туман: ${house.district}\n` : '';
    const buildingLine = house.buildingType ? `🏗 Формат: ${house.buildingType}\n` : '';
    const roomsLine = house.rooms ? `🚪 Комнат: ${house.rooms}\n` : '';
    const floorLine = house.floor ? `🏢 Этаж: ${house.floor}${house.totalFloors ? `/${house.totalFloors}` : ''}\n` : '';
    const areaLine = house.area ? `📐 Площадь: ${house.area} m²\n` : '';
    
    const caption = `🪪 ID: ${house.crmId || house.id || ''}
${districtLine}${landmarkLine}${buildingLine}💎 Состояние: Хороший ремонт
${roomsLine}${floorLine}${areaLine}
💰 Стоимость: ${priceFormatted} $ ${house.discount ? '(стартовая)' : ''}`.trim();

    let images = [];
    if (house.images && house.images.length > 0) {
       images = house.images;
    } else if (house.image) {
       images = [house.image];
    }

    if (images.length === 0) {
      images = ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"];
    }

    const baseUrl = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get("host")}`;

    const media = images.slice(0, 10).map((imgUrl: string, idx: number) => {
      let finalUrl = imgUrl;
      // Absolute url mapping for telegram
      if (finalUrl.startsWith('/')) {
        finalUrl = `${baseUrl}${finalUrl}`;
      } else if (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1')) {
        finalUrl = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";
      }
      return {
        type: 'photo',
        media: finalUrl,
        caption: idx === 0 ? caption : undefined,
      }
    });

    let res;
    if (media.length > 1) {
      res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          media: media
        })
      });
    } else {
      res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: media[0].media,
          caption: caption
        })
      });
    }
    
    let data = await res.json()
    
    if (!data.ok) {
      if (data.description?.includes("failed to get HTTP URL") || data.description?.includes("wrong file identifier")) {
         const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `(Rasm yuklashda xato)\n\n${caption}`
          })
        });
        data = await fallbackRes.json();
        if(!data.ok) {
            return NextResponse.json({ error: data.description }, { status: 400 })
        }
      } else {
         return NextResponse.json({ error: data.description }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
