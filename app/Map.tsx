'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ────────────────────────────────────────────────────────────
// TRANSLATIONS
// ────────────────────────────────────────────────────────────
type Lang = 'uz' | 'ru' | 'en'
const T = {
  uz: {
    gallery: 'Galereya', mapTab: 'Xaritada', filter: 'Filtrlash',
    search: "Nom yoki manzil...", objects: (n: number) => `${n} ta ob'ekt`,
    allDistricts: 'Barcha tumanlar', all: 'Barchasi',
    newBuild: 'Novostroyka', secondary: 'Vtorichka',
    rooms: 'Xonalar', area: 'Kvadratura (m²)', floors: 'Umumiy qavatlar',
    floor: 'Qavat', price: "Narx", district: 'Rayon', type: 'Uy turi',
    apply: "Qo'llash", reset: 'Tozalash',
    loading: "Yuklanmoqda...", retry: 'Qayta urinish',
    noResults: 'Topilmadi', clearFilter: 'Filtrni tozalash',
    share: 'Ulashish', contact: 'Sotuvchi bilan aloqa',
    mapLink: "Yandex Xaritada ↗", desc: 'Tavsif',
    landmark: "Mo'ljal", jk: 'JK', from_: 'dan', to_: 'gacha',
    newTag: 'Yangi', rooms_n: (n: number) => `${n} xona`,
    floor_n: (f: number, t: number | string) => `${f}/${t}-qavat`,
    area_n: (a: number) => `${a} m²`,
    askBtn: 'Savol', askTitle: 'Savol yoki taklif', askPlaceholder: 'Savolingizni yozing...', askSend: 'Yuborish', askSending: 'Yuborilmoqda...', askSent: 'Xabaringiz yuborildi!', askSentSub: 'Tez orada javob beramiz',
  },
  ru: {
    gallery: 'Галерея', mapTab: 'На карте', filter: 'Фильтры',
    search: 'Поиск...', objects: (n: number) => `${n} объектов`,
    allDistricts: 'Все районы', all: 'Все',
    newBuild: 'Новостройка', secondary: 'Вторичка',
    rooms: 'Комнат', area: 'Площадь (м²)', floors: 'Этажей всего',
    floor: 'Этаж', price: 'Цена', district: 'Район', type: 'Тип',
    apply: 'Применить', reset: 'Сбросить',
    loading: 'Загрузка...', retry: 'Повторить',
    noResults: 'Не найдено', clearFilter: 'Сбросить фильтры',
    share: 'Поделиться', contact: 'Связаться с продавцом',
    mapLink: 'Яндекс Карты ↗', desc: 'Описание',
    landmark: 'Ориентир', jk: 'ЖК', from_: 'от', to_: 'до',
    newTag: 'Новый', rooms_n: (n: number) => `${n} комн`,
    floor_n: (f: number, t: number | string) => `${f}/${t} эт`,
    area_n: (a: number) => `${a} м²`,
    askBtn: 'Вопрос', askTitle: 'Вопрос или предложение', askPlaceholder: 'Напишите ваш вопрос...', askSend: 'Отправить', askSending: 'Отправка...', askSent: 'Сообщение отправлено!', askSentSub: 'Скоро ответим',
  },
  en: {
    gallery: 'Gallery', mapTab: 'Map', filter: 'Filter',
    search: 'Search...', objects: (n: number) => `${n} properties`,
    allDistricts: 'All Districts', all: 'All',
    newBuild: 'New Build', secondary: 'Secondary',
    rooms: 'Rooms', area: 'Area (m²)', floors: 'Total Floors',
    floor: 'Floor', price: 'Price', district: 'District', type: 'Type',
    apply: 'Apply', reset: 'Reset',
    loading: 'Loading...', retry: 'Retry',
    noResults: 'Not found', clearFilter: 'Clear filters',
    share: 'Share', contact: 'Contact Seller',
    mapLink: 'Yandex Maps ↗', desc: 'Description',
    landmark: 'Landmark', jk: 'Complex', from_: 'from', to_: 'to',
    newTag: 'New', rooms_n: (n: number) => `${n} rooms`,
    floor_n: (f: number, t: number | string) => `${f}/${t}F`,
    area_n: (a: number) => `${a} m²`,
    askBtn: 'Question', askTitle: 'Question or suggestion', askPlaceholder: 'Write your question...', askSend: 'Send', askSending: 'Sending...', askSent: 'Message sent!', askSentSub: 'We\'ll reply soon',
  },
}

const DISTRICTS = [
  'Yashnobod', 'Yunusobod', 'Chilonzor', 'Mirzo Ulugbek',
  'Shayxontohur', 'Olmazor', 'Bektemir', 'Sergeli',
  'Uchtepa', 'Yakkasaroy', 'Shahar markazi',
]

// ────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────
interface House {
  id: number; title: string; lat: number; lng: number
  price: number; oldPrice: number; rooms: number; area: number; floor: number
  totalFloors: number; district: string; description: string
  landmark: string; jk: string; yandex_url: string; updatedAt: number
  isTop: boolean
}

interface Filters {
  district: string; roomMin: string; roomMax: string
  areaMin: string; areaMax: string; type: 'all' | 'new' | 'secondary'
  floorsMin: string; floorsMax: string; floorMin: string; floorMax: string
  priceMin: string; priceMax: string
}

const EMPTY: Filters = {
  district: '', roomMin: '', roomMax: '', areaMin: '', areaMax: '', type: 'all',
  floorsMin: '', floorsMax: '', floorMin: '', floorMax: '', priceMin: '', priceMax: '',
}

type Tab = 'gallery' | 'map' | 'filter'
const ZOOM_DOT = 9
const ZOOM_LABEL = 14

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
const priceLbl  = (p: number) => !p ? '?' : p < 500_000 ? `$${p.toLocaleString('en')}` : `${(p/1e6).toFixed(0)}M`
const priceStr  = (p: number) => !p ? '—' : p < 500_000 ? `$${p.toLocaleString('en')}` : `${(p/1e6).toFixed(1)} mln so'm`
const discount  = (old: number, cur: number) => old > cur && old > 0 ? Math.round((old - cur) / old * 100) : 0

function applyFilters(h: House[], f: Filters, q: string): House[] {
  return h.filter(x => {
    if (q) { const s = q.toLowerCase(); if (![x.title,x.district,x.landmark,x.jk,String(x.id)].join(' ').toLowerCase().includes(s)) return false }
    if (f.district) { const s = f.district.toLowerCase(); if (![x.district,x.title,x.landmark,x.jk].join(' ').toLowerCase().includes(s)) return false }
    if (f.roomMin && x.rooms < +f.roomMin) return false
    if (f.roomMax && x.rooms > +f.roomMax) return false
    if (f.areaMin && x.area < +f.areaMin) return false
    if (f.areaMax && x.area > +f.areaMax) return false
    if (f.floorsMin && x.totalFloors < +f.floorsMin) return false
    if (f.floorsMax && x.totalFloors > +f.floorsMax) return false
    if (f.floorMin && x.floor < +f.floorMin) return false
    if (f.floorMax && x.floor > +f.floorMax) return false
    if (f.priceMin && x.price < +f.priceMin) return false
    if (f.priceMax && x.price > +f.priceMax) return false
    if (f.type === 'new' && !x.jk) return false
    if (f.type === 'secondary' && x.jk) return false
    return true
  })
}

function makeDotSvg() {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
    '<circle cx="8" cy="8" r="7" fill="#3b82f6" stroke="white" stroke-width="2"/></svg>'
  )
}

function makePriceSvg(label: string) {
  const w = Math.max(64, label.length * 8.5 + 22)
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34">` +
    `<rect x="1" y="1" width="${w-2}" height="24" rx="12" fill="#2563eb" stroke="white" stroke-width="1.5"/>` +
    `<text x="${w/2}" y="17" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white">${label}</text>` +
    `<polygon points="${w/2-5},25 ${w/2},34 ${w/2+5},25" fill="#2563eb"/></svg>`
  )
}

// ────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────
const IcGrid = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IcMap  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
const IcFlt  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
const IcPhone= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
const IcShare= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
const IcX    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcSrch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcRef  = ({ s }: { s: boolean }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation: s ? 'spin 1s linear infinite' : 'none'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
export default function MapPage() {
  const mapRef    = useRef<HTMLDivElement>(null)
  const ymapsRef  = useRef<any>(null)
  const mapObjRef = useRef<any>(null)
  const boundsSet = useRef(false)

  const [ymapsReady, setYmapsReady] = useState(false)
  const [houses,  setHouses]  = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [selected,setSelected]= useState<House | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState<Tab>('gallery')
  const [lang,    setLang]    = useState<Lang>('uz')
  const [lightbox,setLightbox]= useState<{crmId:number;count:number;idx:number}|null>(null)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOnlinePanel, setShowOnlinePanel] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<{id:string;username:string;lastSeen:number}[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const t = T[lang]
  const filtered = applyFilters(houses, filters, search)
    .sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0))
  const fCount = Object.entries(filters).filter(([k,v]) => k==='type'?v!=='all':v!=='').length

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand() }
  }, [])

  // ── Analytics: event yuborish ─────────────────────────────────────────────
  const track = (event: string, data: Record<string, any> = {}) => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, userId, data }),
    }).catch(() => {})
  }

  // ── Presence heartbeat + app_open event ──────────────────────────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const tgUserId  = tg?.initDataUnsafe?.user?.id
    const userId    = tgUserId || `anon_${Math.random().toString(36).slice(2,9)}`
    const tgUser    = tg?.initDataUnsafe?.user
    const username  = tgUser?.username || tgUser?.first_name || (tgUserId ? `user${tgUserId}` : 'unknown')

    // Admin tekshiruv (Telegram ID yoki maxfiy kod orqali)
    const ADMIN_IDS = ['8546867911']
    if (tgUserId && ADMIN_IDS.includes(String(tgUserId))) setIsAdmin(true)

    // App ochildi — analytics
    track('app_open')

    const fetchCount = () => {
      fetch('/api/online-count')
        .then(r => r.json())
        .then(d => { if (d.ok) setOnlineCount(d.online) })
        .catch(() => {})
    }

    const ping = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username }),
      }).then(() => fetchCount()).catch(() => {})
    }

    // Chiqganda darhol o'chirish
    const leave = () => {
      fetch('/api/presence', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        keepalive: true,
      }).catch(() => {})
    }

    // Visibility change — app yashirilsa/ko'rsatilsa
    const onVisibility = () => {
      if (document.hidden) {
        leave()
      } else {
        ping()
      }
    }

    ping()
    const pingId = setInterval(ping, 25_000)
    const countId = setInterval(fetchCount, 25_000)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', leave)
    const tgApp = (window as any).Telegram?.WebApp
    if (tgApp?.onEvent) tgApp.onEvent('viewportChanged', () => { if (tgApp.viewportHeight === 0) leave() })

    return () => {
      clearInterval(pingId)
      clearInterval(countId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', leave)
      leave()
    }
  }, [])

  // ── Admin mode: logoga 5 marta bosish ────────────────────────────────────
  const adminTapRef = useRef(0)
  const adminTapTimer = useRef<any>(null)
  const handleLogoTap = () => {
    adminTapRef.current += 1
    clearTimeout(adminTapTimer.current)
    if (adminTapRef.current >= 5) {
      setIsAdmin(prev => !prev)
      adminTapRef.current = 0
    } else {
      adminTapTimer.current = setTimeout(() => { adminTapRef.current = 0 }, 2000)
    }
  }

  // ── Online users panel (admin) ────────────────────────────────────────────
  const openOnlinePanel = () => {
    setShowOnlinePanel(true)
    fetch('/api/online-count')
      .then(r => r.json())
      .then(d => { if (d.ok) { setOnlineCount(d.online); setOnlineUsers(d.users || []) } })
      .catch(() => {})
  }

  // ── Feedback yuborish ─────────────────────────────────────────────────────
  const sendFeedback = async () => {
    if (!feedbackText.trim()) return
    const tg = (window as any).Telegram?.WebApp
    const userId   = tg?.initDataUnsafe?.user?.id || 'anon'
    const username = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || 'Noma\'lum'
    setFeedbackSending(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, message: feedbackText }),
      })
      setFeedbackSent(true)
      setFeedbackText('')
      setTimeout(() => { setFeedbackSent(false); setShowFeedback(false) }, 2000)
    } catch {}
    setFeedbackSending(false)
  }

  const load = useCallback(async (force = false) => {
    setSyncing(true)
    try {
      const r = await fetch(force ? '/api/amo-leads?force=1' : '/api/amo-leads')
      if (!r.ok) throw new Error(`${r.status}`)
      setHouses(await r.json())
      setError(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setSyncing(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(()=>load(), 300_000); return ()=>clearInterval(id) }, [load])

  // Yandex Maps SDK
  useEffect(() => {
    if (typeof window === 'undefined') return
    const init = () => (window as any).ymaps.ready(() => {
      ymapsRef.current = (window as any).ymaps; setYmapsReady(true)
    })
    if ((window as any).ymaps) return init()
    const s = document.createElement('script')
    s.src = 'https://api-maps.yandex.ru/2.1/?apikey=9e4db997-f532-41e0-8938-d905ec23cae7&lang=ru_RU'
    s.async = true; s.onload = init; document.head.appendChild(s)
  }, [])

  // Render markers based on zoom
  const renderMarkers = useCallback((zoom: number) => {
    const ymaps = ymapsRef.current, map = mapObjRef.current
    if (!ymaps || !map) return
    map.geoObjects.removeAll()

    filtered.forEach(h => {
      if (!h.lat || !h.lng || isNaN(h.lat) || isNaN(h.lng) ||
          h.lat < 37 || h.lat > 46 || h.lng < 55 || h.lng > 74) return

      const isLabel = zoom >= ZOOM_LABEL
      const isDot   = zoom >= ZOOM_DOT && zoom < ZOOM_LABEL

      if (!isLabel && !isDot) return // don't show at very low zoom

      let href: string, size: [number, number], offset: [number, number]
      if (isLabel) {
        const lbl = priceLbl(h.price)
        const w = Math.max(64, lbl.length * 8.5 + 22)
        href = makePriceSvg(lbl); size = [w, 34]; offset = [-w/2, -34]
      } else {
        // Zoom ga qarab dot o'lchami: yaqin = 16, uzoq = 10
        const d = zoom >= 12 ? 16 : zoom >= 11 ? 13 : 10
        href = makeDotSvg(); size = [d, d]; offset = [-d/2, -d/2]
      }

      const pm = new ymaps.Placemark([h.lat, h.lng], { hintContent: h.title }, {
        iconLayout: 'default#imageWithContent',
        iconImageHref: href, iconImageSize: size, iconImageOffset: offset,
      })
      pm.events.add('click', () => openCard(h, true))
      map.geoObjects.add(pm)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  const openCard = (h: House, switchToMap = false) => {
    setSelected(h)
    track('property_view', { crmId: h.id, title: h.title, district: h.district })
    if (switchToMap) {
      setTab('map')
      if (mapObjRef.current) {
        mapObjRef.current.panTo([h.lat, h.lng], { flying: false, duration: 300 })
      }
    }
  }

  useEffect(() => {
    if (!mapRef.current || !ymapsReady || !ymapsRef.current) return
    const ymaps = ymapsRef.current
    ymaps.ready(() => {
      if (!mapObjRef.current) {
        mapObjRef.current = new ymaps.Map(mapRef.current, {
          center: [41.2995, 69.2401], zoom: 11, controls: ['zoomControl'],
        })
        mapObjRef.current.events.add('boundschange', (e: any) => {
          if (e.get('newZoom') !== e.get('oldZoom')) {
            renderMarkers(mapObjRef.current.getZoom())
          }
        })
      }
      renderMarkers(mapObjRef.current.getZoom())
    })
  }, [filtered, ymapsReady, renderMarkers])

  useEffect(() => {
    if (tab === 'map') setTimeout(() => { try { mapObjRef.current?.container?.fitToViewport() } catch {} }, 150)
  }, [tab])

  useEffect(() => () => { try { mapObjRef.current?.destroy() } catch {}; mapObjRef.current = null }, [])

  const shareHouse = (h: House) => {
    track('share_click', { crmId: h.id, district: h.district })
    const tgApp = (window as any).Telegram?.WebApp

    const text = [
      `🏠 ${h.title}`,
      h.price  > 0 ? `💰 ${priceStr(h.price)}` : '',
      h.rooms  > 0 ? `🛏 ${h.rooms} xona` : '',
      h.area   > 0 ? `📐 ${h.area} m²` : '',
      h.floor  > 0 ? `🏢 ${h.floor}/${h.totalFloors||'?'}-qavat` : '',
      h.jk      ? `🏗 ${h.jk}` : '',
      h.district? `📍 ${h.district}` : '',
      h.landmark? `🗺 ${h.landmark}` : '',
      '',
      `📞 +998 91 551 44 99`,
    ].filter(s => s !== undefined && s !== null && (s.length > 0 || true))
     .join('\n')
     .trim()

    const url  = h.yandex_url || 'https://t.me/mulkinvestbot'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

    if (tgApp?.openTelegramLink) {
      tgApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const callSeller = (crmId?: number) => {
    track('call_click', { crmId })
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openLink) tg.openLink('tel:+998915514499')
    else window.open('tel:+998915514499')
  }
  const cycleLang = () => setLang(l => l==='uz'?'ru':l==='ru'?'en':'uz')

  if (loading) return (
    <div className="flex flex-col items-center justify-center bg-slate-900" style={{height:'100dvh'}}>
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"/>
      <p className="text-slate-400 text-sm">{t.loading}</p>
    </div>
  )
  if (error && !houses.length) return (
    <div className="flex flex-col items-center justify-center bg-slate-900 gap-4 px-6" style={{height:'100dvh'}}>
      <p className="text-red-400 text-center text-sm">{error}</p>
      <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm" onClick={()=>load(true)}>{t.retry}</button>
    </div>
  )

  return (
    <div className="flex flex-col bg-slate-900 text-white" style={{height:'100dvh',overflow:'hidden'}}>

      {/* LIGHTBOX — MapPage darajasida (transform muammosiz) */}
      {lightbox && (
        <Lightbox
          crmId={lightbox.crmId} count={lightbox.count} initial={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── ADMIN: Online users panel ──────────────────────────────────── */}
      {showOnlinePanel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="w-full max-w-md bg-slate-900 rounded-t-2xl p-4" style={{maxHeight:'80vh',overflowY:'auto'}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">🟢 Online foydalanuvchilar ({onlineCount})</h2>
              <button onClick={() => setShowOnlinePanel(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            {onlineUsers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Hozir hech kim online emas</p>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map(u => {
                  const secAgo = Math.max(0, Math.floor((Date.now() - u.lastSeen) / 1000))
                  const timeStr = secAgo < 60 ? `${secAgo}s oldin` : `${Math.floor(secAgo/60)}m oldin`
                  const isAnon = String(u.id).startsWith('anon_')
                  const openChat = () => {
                    if (isAnon) return
                    const tg = (window as any).Telegram?.WebApp
                    try {
                      if (tg?.openTelegramLink) {
                        tg.openTelegramLink(`https://t.me/${u.username || `user${u.id}`}`)
                      } else {
                        window.location.href = `tg://user?id=${u.id}`
                      }
                    } catch {}
                  }
                  return (
                    <div key={u.id}
                      onClick={openChat}
                      className={`flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5 transition-colors ${!isAnon ? 'cursor-pointer active:bg-slate-700 hover:bg-slate-700' : 'opacity-70'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{isAnon ? '👤' : '🙍‍♂️'}</span>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {isAnon ? 'Anonim (Mac)' : (u.username ? `@${u.username}` : `User ${u.id}`)}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {isAnon ? 'Telegram ID yo\'q' : '💬 bosib chat oching'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-400">{timeStr}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={openOnlinePanel}
              className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-sm transition-colors">
              🔄 Yangilash
            </button>
          </div>
        </div>
      )}

      {/* ── FEEDBACK: Savol yuborish modal ────────────────────────────── */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="w-full max-w-md bg-slate-900 rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">💬 {t.askTitle}</h2>
              <button onClick={() => { setShowFeedback(false); setFeedbackText('') }} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            {feedbackSent ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-white font-medium">{t.askSent}</p>
                <p className="text-slate-400 text-sm mt-1">{t.askSentSub}</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={t.askPlaceholder}
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl p-3 text-sm outline-none resize-none"
                  rows={4}
                  style={{fontSize:'16px'}}
                />
                <button
                  onClick={sendFeedback}
                  disabled={!feedbackText.trim() || feedbackSending}
                  className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-white font-bold text-sm transition-colors">
                  {feedbackSending ? t.askSending : `📤 ${t.askSend}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 flex-shrink-0">
        <div onClick={handleLogoTap} style={{cursor:'default',userSelect:'none'}}>
          <p className="text-[11px] font-bold tracking-[0.2em] text-blue-400 uppercase">Mulk Invest</p>
          <p className="text-xs text-slate-400">{t.objects(filtered.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Online counter — faqat admin ko'radi */}
          {isAdmin && (
            <button onClick={openOnlinePanel}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: onlineCount !== null ? '#22c55e' : '#64748b',
                display: 'inline-block',
                boxShadow: onlineCount !== null ? '0 0 6px #22c55e' : 'none',
                animation: onlineCount !== null ? 'pulse-green 2s infinite' : 'none',
              }}/>
              <span className="text-xs font-semibold text-white">
                {onlineCount !== null ? onlineCount : '—'}
              </span>
            </button>
          )}
          {/* Savol tugmasi — admindan boshqa hammaga */}
          {!isAdmin && (
            <button onClick={() => setShowFeedback(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors">
              💬 {t.askBtn}
            </button>
          )}
          <button onClick={cycleLang}
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold tracking-wide transition-colors">
            {lang.toUpperCase()}
          </button>
          <button onClick={()=>load(true)} disabled={syncing} className="text-slate-400 hover:text-white p-1 transition-colors">
            <IcRef s={syncing}/>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-800/70 border-b border-white/8 flex-shrink-0">
        {([
          {id:'gallery' as Tab, label:t.gallery, I:IcGrid},
          {id:'map'     as Tab, label:t.mapTab,  I:IcMap },
          {id:'filter'  as Tab, label:t.filter,  I:IcFlt },
        ]).map(({id,label,I})=>(
          <button key={id} onClick={()=>{ setTab(id); if(id!=='map') setSelected(null); track('tab_switch',{tab:id}) }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative transition-colors ${
              tab===id?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}>
            <I/>
            {label}
            {id==='filter'&&fCount>0&&(
              <span className="absolute top-1 right-[20%] w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                {fCount}
              </span>
            )}
            {tab===id&&<span className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-400 rounded-t-full"/>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative" style={{minHeight:0}}>

        {/* MAP - always mounted, shown when map tab */}
        <div className="absolute inset-0" style={{display: tab==='map'?'block':'none'}}>
          <div ref={mapRef} style={{width:'100%',height:'100%'}}/>

          {/* CARD ON MAP (bottom sheet, no dark overlay) */}
          {selected && tab==='map' && (
            <MapCard
              house={selected} t={t}
              onClose={()=>setSelected(null)}
              onShare={()=>shareHouse(selected)}
              onCall={callSeller}
              onOpenLightbox={(crmId,count,idx)=>setLightbox({crmId,count,idx})}
            />
          )}
        </div>

        {/* GALLERY */}
        {tab==='gallery'&&(
          <div className="absolute inset-0 flex flex-col">
            <div className="px-3 py-2.5 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
                <span className="text-slate-500"><IcSrch/></span>
                <input type="search" placeholder={t.search} value={search}
                  onChange={e=>setSearch(e.target.value)}
                  className="bg-transparent flex-1 text-white placeholder-slate-500 outline-none"
                  style={{fontSize:'16px'}}/>
                {search&&<button onClick={()=>setSearch('')} className="text-slate-500 hover:text-white"><IcX/></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filtered.length===0?(
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
                  <IcSrch/><p className="text-sm">{t.noResults}</p>
                  <button onClick={()=>{setSearch('');setFilters(EMPTY)}} className="text-blue-400 text-xs underline">{t.clearFilter}</button>
                </div>
              ):filtered.map(h=>(
                <GCard
                  key={h.id} h={h} t={t}
                  onClick={()=>openCard(h)}
                  onImageClick={(crmId,count,idx)=>{ setLightbox({crmId,count,idx}); track('photo_view',{crmId}) }}
                />
              ))}
            </div>
            {/* CARD OVERLAY in gallery (no map switch) */}
            {selected&&(
              <MapCard
                house={selected} t={t}
                onClose={()=>setSelected(null)}
                onShare={()=>shareHouse(selected)}
                onCall={callSeller}
                onOpenLightbox={(crmId,count,idx)=>setLightbox({crmId,count,idx})}
              />
            )}
          </div>
        )}

        {/* FILTER */}
        {tab==='filter'&&(
          <FPanel f={filters} setF={setFilters} t={t}
            onApply={()=>{
              boundsSet.current=false; setTab('map')
              track('filter_apply', {
                district: filters.district,
                type: filters.type,
                priceMin: filters.priceMin, priceMax: filters.priceMax,
                roomMin: filters.roomMin,   roomMax: filters.roomMax,
                areaMin: filters.areaMin,   areaMax: filters.areaMax,
              })
            }}
            onReset={()=>{setFilters(EMPTY);boundsSet.current=false}}/>
        )}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .slide-up{animation:slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        @keyframes pulse-green{
          0%,100%{box-shadow:0 0 4px #22c55e}
          50%{box-shadow:0 0 10px #22c55e, 0 0 18px #22c55e80}
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// MAP CARD (bottom sheet ON map, no dark overlay)
// ────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
// FULLSCREEN LIGHTBOX
// ────────────────────────────────────────────────────────────
function Lightbox({ crmId, count, initial, onClose }: {
  crmId: number; count: number; initial: number; onClose: () => void
}) {
  const [cur, setCur] = useState(initial)
  const startX = useRef(0)

  const prev = () => setCur(c => Math.max(0, c - 1))
  const next = () => setCur(c => Math.min(count - 1, c + 1))

  const onTS = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTE = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx < -40) next()
    else if (dx > 40) prev()
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black"
      style={{touchAction:'pan-y'}}
      onTouchStart={onTS} onTouchEnd={onTE}>

      {/* Rasm — to'liq ekran */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photo/${crmId}?index=${cur}`} alt=""
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'contain',
        }}
      />

      {/* Overlay: yopish + counter */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-10 pb-4"
        style={{background:'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 100%)'}}>
        <span className="text-white text-sm font-semibold">{cur+1} / {count}</span>
        <button onClick={onClose}
          className="w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white">
          <IcX/>
        </button>
      </div>

      {/* Chap/o'ng strelkalar */}
      {count > 1 && (
        <div className="absolute inset-y-0 inset-x-0 flex items-center justify-between px-3 pointer-events-none">
          <button onClick={prev} disabled={cur===0}
            className="pointer-events-auto w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white text-xl font-bold disabled:opacity-20">
            ‹
          </button>
          <button onClick={next} disabled={cur===count-1}
            className="pointer-events-auto w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white text-xl font-bold disabled:opacity-20">
            ›
          </button>
        </div>
      )}

      {/* Pastki dots */}
      {count > 1 && count <= 12 && (
        <div className="absolute bottom-0 inset-x-0 flex justify-center gap-1.5 pb-10"
          style={{background:'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 100%)'}}>
          {Array.from({length: count}, (_, i) => (
            <div key={i} onClick={() => setCur(i)} style={{
              width: i===cur ? 18 : 6, height: 6, borderRadius: 3,
              background: i===cur ? 'white' : 'rgba(255,255,255,0.4)',
              transition:'all 0.2s', cursor:'pointer',
            }}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// PHOTO CAROUSEL
// ────────────────────────────────────────────────────────────
function PhotoCarousel({ crmId, onOpen }: { crmId: number; onOpen:(count:number,idx:number)=>void }) {
  const [count, setCount] = useState(1)
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/photo/${crmId}?count=1`)
      .then(r => r.json())
      .then(d => { if (d.count > 0) setCount(d.count) })
      .catch(() => {})
  }, [crmId])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth)
    setCurrent(Math.max(0, Math.min(idx, count - 1)))
  }

  return (
    <div className="relative bg-slate-800 rounded-2xl overflow-hidden mb-3" style={{height:'220px'}}>
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex h-full"
        style={{overflowX:'scroll',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}>
        {Array.from({length: count}, (_, i) => (
          <div key={i} style={{minWidth:'100%',scrollSnapAlign:'start',background:'#1e293b'}}
            onClick={() => onOpen(count, i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photo/${crmId}?index=${i}`} alt=""
              className="w-full h-full"
              style={{objectFit:'contain',cursor:'pointer'}}
              onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {current+1}/{count}
          </div>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {Array.from({length: count}, (_, i) => (
              <div key={i} style={{
                width: i===current ? 16 : 6, height:6,
                borderRadius: 3, background: i===current ? 'white' : 'rgba(255,255,255,0.4)',
                transition:'all 0.2s'
              }}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MapCard({house:h,t,onClose,onShare,onCall,onOpenLightbox}:{
  house:House; t:typeof T['uz']; onClose:()=>void; onShare:()=>void; onCall:()=>void
  onOpenLightbox:(crmId:number,count:number,idx:number)=>void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY   = useRef(0)
  const dragging = useRef(false)

  const onTS = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    dragging.current = true
    if (sheetRef.current) { sheetRef.current.style.transition='none' }
  }
  const onTM = (e: React.TouchEvent) => {
    if (!dragging.current||!sheetRef.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  const onTE = (e: React.TouchEvent) => {
    if (!dragging.current||!sheetRef.current) return
    dragging.current = false
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 80) { onClose() }
    else {
      sheetRef.current.style.transition = 'transform 0.25s ease'
      sheetRef.current.style.transform  = 'translateY(0)'
    }
  }

  return (
    <>
      {/* Tap-outside to close (transparent, above map) */}
      <div className="absolute inset-x-0 top-0 z-40"
        style={{bottom:'62dvh'}}
        onClick={onClose}/>

      {/* Card */}
      <div ref={sheetRef}
        className="slide-up absolute inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-3xl border-t border-white/10"
        style={{height:'62dvh',display:'flex',flexDirection:'column'}}>

        {/* Drag handle — BIG touch area */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-2 pb-1"
          style={{touchAction:'none', paddingTop:12, paddingBottom:8}}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
          <div className="w-10 h-1.5 bg-slate-600 rounded-full"/>
        </div>

        {/* Close btn */}
        <button onClick={onClose}
          className="absolute top-2.5 right-3.5 text-slate-500 hover:text-white p-1.5 z-10">
          <IcX/>
        </button>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">

          {/* Photo Carousel */}
          <PhotoCarousel crmId={h.id} onOpen={(count,idx)=>onOpenLightbox(h.id,count,idx)}/>

          {/* Badges */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {h.isTop&&<span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ TOP</span>}
            {h.jk&&<span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">{h.jk}</span>}
          </div>

          {/* Price + title */}
          <div className="mb-3">
            {/* Discount: old price strikethrough in red */}
            {h.oldPrice>0&&h.oldPrice>h.price&&(
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm text-red-400 line-through">{priceStr(h.oldPrice)}</p>
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  −{discount(h.oldPrice,h.price)}%
                </span>
              </div>
            )}
            <p className="text-xl font-bold text-blue-400">{priceStr(h.price)}</p>
            <p className="text-sm font-medium leading-snug mt-0.5">{h.title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">CRM #{h.id}</p>
          </div>

          {/* Info chips */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {h.rooms>0&&<Chip icon="🛏" l={t.rooms} v={t.rooms_n(h.rooms)}/>}
            {h.area >0&&<Chip icon="📐" l={t.area}  v={t.area_n(h.area)}/>}
            {h.floor>0&&<Chip icon="🏢" l={t.floor}  v={t.floor_n(h.floor,h.totalFloors||'?')}/>}
            {h.district&&<Chip icon="📍" l={t.district} v={h.district}/>}
          </div>

          {h.landmark&&<IRow l={`🗺 ${t.landmark}`} v={h.landmark}/>}
          {h.description&&<IRow l={t.desc} v={h.description}/>}

          {h.yandex_url&&(
            <a href={h.yandex_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 mb-3 hover:bg-slate-700 transition-colors">
              <span>📌</span>
              <span className="text-sm text-blue-400 font-medium">{t.mapLink}</span>
            </a>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 px-4 pt-2 pb-5 border-t border-white/8 flex-shrink-0">
          <button onClick={onShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
            <IcShare/>{t.share}
          </button>
          <button onClick={onCall}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">
            <IcPhone/>{t.contact}
          </button>
        </div>
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────
// GALLERY CARD
// ────────────────────────────────────────────────────────────
function GCard({h,t,onClick,onImageClick}:{
  h:House; t:typeof T['uz']; onClick:()=>void
  onImageClick:(crmId:number,count:number,idx:number)=>void
}) {
  const [photoCount,setPhotoCount]=useState(1)
  const [curIdx,setCurIdx]=useState(0)
  const [imgErrors,setImgErrors]=useState<Record<number,boolean>>({})
  const disc = discount(h.oldPrice, h.price)
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  useEffect(()=>{
    fetch(`/api/photo/${h.id}?count=1`)
      .then(r=>r.json())
      .then(d=>{ if(d.count>0) setPhotoCount(d.count) })
      .catch(()=>{})
  },[h.id])

  const prevPhoto=(e:React.TouchEvent|React.MouseEvent)=>{
    e.stopPropagation()
    setCurIdx(i=>Math.max(0,i-1))
  }
  const nextPhoto=(e:React.TouchEvent|React.MouseEvent)=>{
    e.stopPropagation()
    setCurIdx(i=>Math.min(photoCount-1,i+1))
  }
  const onTouchStart=(e:React.TouchEvent)=>{
    touchStartX.current=e.touches[0].clientX
    touchDeltaX.current=0
  }
  const onTouchMove=(e:React.TouchEvent)=>{
    touchDeltaX.current=e.touches[0].clientX-touchStartX.current
  }
  const onTouchEnd=(e:React.TouchEvent)=>{
    const dx=touchDeltaX.current
    if(Math.abs(dx)>40){
      e.stopPropagation()
      if(dx<0) setCurIdx(i=>Math.min(photoCount-1,i+1))
      else      setCurIdx(i=>Math.max(0,i-1))
    } else if(Math.abs(dx)<8){
      onClick()
    }
  }

  const hasPhoto = !imgErrors[curIdx]

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden ${
        h.isTop ? 'bg-slate-800 border border-yellow-500/40' : 'bg-slate-800 border border-white/5'
      }`}
      onClick={onClick}
    >
      {/* ── RASM ── */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ paddingTop: '72%', background: '#0f172a' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={curIdx}
            src={`/api/photo/${h.id}?index=${curIdx}`}
            alt={h.title}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={() => setImgErrors(prev=>({...prev,[curIdx]:true}))}
          />
        ) : (
          <div style={{position:'absolute',inset:0}} className="flex items-center justify-center bg-slate-700">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {h.isTop && <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ TOP</span>}
          {!h.isTop && h.jk && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">{t.newTag}</span>}
        </div>
        {disc > 0 && <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">−{disc}%</span>}
        {h.price > 0 && <span className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-sm font-bold px-2.5 py-1 rounded-xl">{priceLbl(h.price)}</span>}
        {/* Photo dots */}
        {photoCount > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({length:Math.min(photoCount,7)},(_,i)=>(
              <span key={i} style={{width:5,height:5,borderRadius:'50%',background:i===curIdx?'#fff':'rgba(255,255,255,0.4)',display:'inline-block'}}/>
            ))}
          </div>
        )}
        {/* Prev/Next arrows (on desktop) */}
        {photoCount>1&&curIdx>0&&(
          <button onClick={prevPhoto} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">‹</button>
        )}
        {photoCount>1&&curIdx<photoCount-1&&(
          <button onClick={nextPhoto} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">›</button>
        )}
      </div>

      {/* ── INFO: pastki qism ── */}
      <div className="px-3.5 py-3 cursor-pointer" onClick={onClick}>
        <p className="font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{h.title}</p>
        {disc > 0 && h.oldPrice > 0 && (
          <p className="text-xs text-red-400 line-through mb-0.5">{priceStr(h.oldPrice)}</p>
        )}
        {(h.district || h.landmark) && (
          <p className="text-xs text-slate-400 mb-2 truncate">📍 {h.district || h.landmark}</p>
        )}
        <div className="flex gap-3 text-xs text-slate-300 flex-wrap">
          {h.rooms > 0 && <span>🛏 {t.rooms_n(h.rooms)}</span>}
          {h.area  > 0 && <span>📐 {t.area_n(h.area)}</span>}
          {h.floor > 0 && <span>🏢 {t.floor_n(h.floor, h.totalFloors || '?')}</span>}
        </div>
      </div>
    </div>
  )
}

function Chip({icon,l,v}:{icon:string;l:string;v:string}) {
  return <div className="bg-slate-800 rounded-xl px-3 py-2.5"><p className="text-[9px] text-slate-400 mb-0.5">{icon} {l}</p><p className="text-sm font-semibold">{v}</p></div>
}
function IRow({l,v}:{l:string;v:string}) {
  return <div className="bg-slate-800 rounded-xl px-3.5 py-3 mb-2.5"><p className="text-[9px] text-slate-400 mb-0.5">{l}</p><p className="text-sm text-slate-200 leading-relaxed">{v}</p></div>
}

// ────────────────────────────────────────────────────────────
// FILTER PANEL
// ────────────────────────────────────────────────────────────
function FPanel({f,setF,t,onApply,onReset}:{
  f:Filters; setF:React.Dispatch<React.SetStateAction<Filters>>
  t:typeof T['uz']; onApply:()=>void; onReset:()=>void
}) {
  const set=(k:keyof Filters)=>(v:string)=>setF(p=>({...p,[k]:v}))
  const inp="bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:border-blue-500 outline-none w-full text-center"
  const label="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1"
  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-900" style={{paddingBottom:'68px'}}>
      <div className="p-3 space-y-3">

        {/* Rayon */}
        <select className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
          style={{fontSize:'16px'}} value={f.district} onChange={e=>set('district')(e.target.value)}>
          <option value="">{t.allDistricts}</option>
          {DISTRICTS.map(d=><option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>

        {/* Tur */}
        <div className="flex gap-1.5">
          {([{v:'all' as const,l:t.all},{v:'new' as const,l:t.newBuild},{v:'secondary' as const,l:t.secondary}]).map(o=>(
            <button key={o.v} onClick={()=>setF(p=>({...p,type:o.v}))}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                f.type===o.v?'bg-blue-600 text-white':'bg-slate-800 text-slate-300 border border-white/10'
              }`}>{o.l}</button>
          ))}
        </div>

        {/* 2-ustunli grid: xonalar + kvadratura */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className={label}>{t.rooms}</p>
            <div className="flex gap-1 items-center">
              <input type="number" inputMode="numeric" placeholder={t.from_} value={f.roomMin} onChange={e=>set('roomMin')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
              <span className="text-slate-600 text-xs">—</span>
              <input type="number" inputMode="numeric" placeholder={t.to_} value={f.roomMax} onChange={e=>set('roomMax')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
            </div>
          </div>
          <div>
            <p className={label}>{t.area} m²</p>
            <div className="flex gap-1 items-center">
              <input type="number" inputMode="numeric" placeholder={t.from_} value={f.areaMin} onChange={e=>set('areaMin')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
              <span className="text-slate-600 text-xs">—</span>
              <input type="number" inputMode="numeric" placeholder={t.to_} value={f.areaMax} onChange={e=>set('areaMax')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
            </div>
          </div>
          <div>
            <p className={label}>{t.floor}</p>
            <div className="flex gap-1 items-center">
              <input type="number" inputMode="numeric" placeholder={t.from_} value={f.floorMin} onChange={e=>set('floorMin')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
              <span className="text-slate-600 text-xs">—</span>
              <input type="number" inputMode="numeric" placeholder={t.to_} value={f.floorMax} onChange={e=>set('floorMax')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
            </div>
          </div>
          <div>
            <p className={label}>{t.floors}</p>
            <div className="flex gap-1 items-center">
              <input type="number" inputMode="numeric" placeholder={t.from_} value={f.floorsMin} onChange={e=>set('floorsMin')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
              <span className="text-slate-600 text-xs">—</span>
              <input type="number" inputMode="numeric" placeholder={t.to_} value={f.floorsMax} onChange={e=>set('floorsMax')(e.target.value)} className={inp} style={{fontSize:'16px'}}/>
            </div>
          </div>
        </div>

        {/* Narx */}
        <div>
          <p className={label}>{t.price} ($)</p>
          <div className="flex gap-2 items-center">
            <input type="number" inputMode="numeric" placeholder={t.from_} value={f.priceMin} onChange={e=>set('priceMin')(e.target.value)}
              className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:border-blue-500 outline-none" style={{fontSize:'16px'}}/>
            <span className="text-slate-600">—</span>
            <input type="number" inputMode="numeric" placeholder={t.to_} value={f.priceMax} onChange={e=>set('priceMax')(e.target.value)}
              className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:border-blue-500 outline-none" style={{fontSize:'16px'}}/>
          </div>
        </div>

      </div>
      <div className="fixed bottom-0 inset-x-0 flex gap-2 px-3 py-2.5 bg-slate-900/96 border-t border-white/10">
        <button onClick={onReset} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">{t.reset}</button>
        <button onClick={onApply} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">{t.apply}</button>
      </div>
    </div>
  )
}

function Sec({title,children}:{title:string;children:React.ReactNode}) {
  return <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>{children}</div>
}
function Rng({mn,mx,oMn,oMx,t}:{mn:string;mx:string;oMn:(v:string)=>void;oMx:(v:string)=>void;t:typeof T['uz']}) {
  const cls="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
  return (
    <div className="flex gap-2 items-center">
      <input type="number" placeholder={t.from_} value={mn} onChange={e=>oMn(e.target.value)} className={cls} style={{fontSize:'16px'}}/>
      <span className="text-slate-600 font-bold select-none">—</span>
      <input type="number" placeholder={t.to_}   value={mx} onChange={e=>oMx(e.target.value)} className={cls} style={{fontSize:'16px'}}/>
    </div>
  )
}
