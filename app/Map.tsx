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
  },
}

const DISTRICTS = [
  'Yashnobod', 'Yunusobod', 'Chilonzor', 'Mirzo Ulugbek',
  'Shayxontohur', 'Olmazor', 'Bektemir', 'Sergeli',
  'Uchtepa', 'Yakkasaroy', 'Shahar markazi',
]

function norm(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[''ʼʻ`ʹ]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────
interface House {
  id: number;
  olx_id?: string;
  title: string; lat: number; lng: number
  price: number; rooms: number; area: number; floor: number
  totalFloors: number; district: string; description: string
  landmark: string; jk: string; yandex_url: string; updatedAt: number
  isTop?: boolean
}

interface Filters {
  district: string; roomMin: string; roomMax: string
  areaMin: string; areaMax: string; type: 'all' | 'new' | 'secondary'
  floorsMin: string; floorsMax: string; floorMin: string; floorMax: string
  priceMin: string; priceMax: string
}

interface OnlineUser {
  userId: number
  username: string | null
  firstName: string
  lastName: string
  lastSeen: number
}

const EMPTY: Filters = {
  district: '', roomMin: '', roomMax: '', areaMin: '', areaMax: '', type: 'all',
  floorsMin: '', floorsMax: '', floorMin: '', floorMax: '', priceMin: '', priceMax: '',
}

type Tab = 'gallery' | 'map' | 'filter' | 'admin'
const ZOOM_DOT = 13
const ZOOM_LABEL = 15

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
const priceLbl = (p: number) => !p ? '?' : p < 500_000 ? `$${p.toLocaleString('en')}` : `${(p / 1e6).toFixed(0)}M`
const priceStr = (p: number) => !p ? '—' : p < 500_000 ? `$${p.toLocaleString('en')}` : `${(p / 1e6).toFixed(1)} mln so'm`

function secsAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'hozirgina'
  if (s < 60) return `${s}s oldin`
  if (s < 3600) return `${Math.floor(s / 60)}m oldin`
  return `${Math.floor(s / 3600)}s oldin`
}

function applyFilters(h: House[], f: Filters, q: string): House[] {
  return h.filter(x => {
    if (q) {
      const s = norm(q)
      const hay = norm([x.title, x.district, x.landmark, x.jk, String(x.id), String(x.price)].join(' '))
      if (!s.split(' ').filter(Boolean).every(w => hay.includes(w))) return false
    }
    if (f.district) {
      const s = norm(f.district)
      const hay = norm([x.district, x.title, x.landmark, x.jk].join(' '))
      if (!s.split(' ').filter(Boolean).every(w => hay.includes(w))) return false
    }
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
    `<rect x="1" y="1" width="${w - 2}" height="24" rx="12" fill="#2563eb" stroke="white" stroke-width="1.5"/>` +
    `<text x="${w / 2}" y="17" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white">${label}</text>` +
    `<polygon points="${w / 2 - 5},25 ${w / 2},34 ${w / 2 + 5},25" fill="#2563eb"/></svg>`
  )
}

// ────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────
const IcGrid = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
const IcMap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
const IcFlt = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
const IcAdmin = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const IcShare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
const IcPhone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>

const IcX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const IcSrch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
const IcRef = ({ s }: { s: boolean }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: s ? 'spin 1s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const ymapsRef = useRef<any>(null)
  const mapObjRef = useRef<any>(null)
  const boundsSet = useRef(false)

  const [ymapsReady, setYmapsReady] = useState(false)
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<House | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('gallery')
  const [lang, setLang] = useState<Lang>('uz')
  const [lightboxInfo, setLightboxInfo] = useState<{ crmId: number; index: number; count: number } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const isAdminRef = useRef(false)
  const [adminResolved, setAdminResolved] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)

  // Admin
  const [adminSubTab, setAdminSubTab] = useState<'online' | 'hidden'>('online')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  const t = T[lang]
  const filteredRaw = applyFilters(houses, filters, search)
  const filtered = [...filteredRaw].sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0))
  const fCount = Object.entries(filters).filter(([k, v]) => k === 'type' ? v !== 'all' : v !== '').length

  // iOS zoom to'liq to'sish
  useEffect(() => {
    let lastTouch = 0
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouch < 300) e.preventDefault()
      lastTouch = now
    }
    document.addEventListener('touchstart', onTouchStart, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Telegram init + admin tekshirish
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand() }

    const checkAdmin = async () => {
      const chatId = tg?.initDataUnsafe?.user?.id
      const initData = tg?.initData || ''
      if (chatId || initData) {
        try {
          const r = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check', chatId, initData }),
          })
          const d = await r.json()
          if (d.ok && d.isAdmin) setIsAdmin(true)
        } catch { }
      }
      setAdminResolved(true)
    }
    checkAdmin()
  }, [])

  useEffect(() => { isAdminRef.current = isAdmin }, [isAdmin])

  // Admin check tugagandan KEYIN 10 soniya timer (admin uchun emas)
  useEffect(() => {
    if (!adminResolved) return
    if (isAdmin) return
    const timer = setTimeout(() => {
      try {
        const tg = (window as any).Telegram?.WebApp
        const uid = tg?.initDataUnsafe?.user?.id
        const key = uid ? `lfts_${uid}` : 'lfts'
        const stored = localStorage.getItem(key)
        if (stored && Date.now() - parseInt(stored) < 86_400_000) return // 24h cooldown
      } catch { }
      setShowLeadForm(true)
    }, 10_000)
    return () => clearTimeout(timer)
  }, [adminResolved, isAdmin])

  // Heartbeat: bu foydalanuvchi hozir online ekanligini bildirish
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const user = tg?.initDataUnsafe?.user
    if (!user?.id) return

    const beat = () => fetch('/api/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        username: user.username || null,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
      }),
    }).catch(() => { })

    beat()
    const id = setInterval(beat, 30_000)
    return () => clearInterval(id)
  }, [])

  // Admin: online foydalanuvchilarni olish (har 15s)
  useEffect(() => {
    if (!isAdmin) return
    const tg = (window as any).Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id
    if (!chatId) return

    const fetchOnline = () => fetch(`/api/online?chatId=${chatId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setOnlineUsers(d.users || []) })
      .catch(() => { })

    fetchOnline()
    const id = setInterval(fetchOnline, 15_000)
    return () => clearInterval(id)
  }, [isAdmin])

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
  useEffect(() => { const id = setInterval(() => load(), 60_000); return () => clearInterval(id) }, [load])

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

  const renderMarkers = useCallback((zoom: number) => {
    const ymaps = ymapsRef.current, map = mapObjRef.current
    if (!ymaps || !map) return
    map.geoObjects.removeAll()

    filtered.forEach(h => {
      if (!h.lat || !h.lng || isNaN(h.lat) || isNaN(h.lng) ||
        h.lat < 37 || h.lat > 46 || h.lng < 55 || h.lng > 74) return

      const isLabel = zoom >= ZOOM_LABEL
      const isDot = zoom >= ZOOM_DOT && zoom < ZOOM_LABEL
      if (!isLabel && !isDot) return

      let href: string, size: [number, number], offset: [number, number]
      if (isLabel) {
        const lbl = priceLbl(h.price)
        const w = Math.max(64, lbl.length * 8.5 + 22)
        href = makePriceSvg(lbl); size = [w, 34]; offset = [-w / 2, -34]
      } else {
        href = makeDotSvg(); size = [16, 16]; offset = [-8, -8]
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

  const openCard = (h: House, fromMarker = false) => {
    setSelected(h)
    if (fromMarker && mapObjRef.current) {
      mapObjRef.current.panTo([h.lat, h.lng], { flying: false, duration: 300 })
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
    if (tab === 'map') setTimeout(() => { try { mapObjRef.current?.container?.fitToViewport() } catch { } }, 150)
  }, [tab])

  useEffect(() => () => { try { mapObjRef.current?.destroy() } catch { }; mapObjRef.current = null }, [])

  const shareHouse = async (h: House) => {
    const tg = (window as any).Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id
    const caption = [
      `🏠 ${h.title}`,
      `💰 ${priceStr(h.price)}`,
      h.rooms ? `🛏 ${t.rooms_n(h.rooms)}` : '',
      h.area ? `📐 ${t.area_n(h.area)}` : '',
      h.floor ? `🏢 ${t.floor_n(h.floor, h.totalFloors || '?')}` : '',
      h.district ? `📍 ${h.district}` : '',
      h.landmark ? `🗺 ${h.landmark}` : '',
      h.yandex_url ? `📌 ${h.yandex_url}` : '',
      `📞 +998 91 551 44 99`,
    ].filter(Boolean).join('\n')

    if (chatId) {
      try {
        const r = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crmId: h.id, olx_id: h.olx_id, chatId, caption }),
        })
        const d = await r.json()
        if (d.ok) {
          tg?.showAlert?.("✅ Chatga yuborildi!")
          return
        }
      } catch { }
    }
    tg?.showAlert?.("❌ Yuborib bo'lmadi")
  }

  // Foydalanuvchi Telegram profiliga o'tish
  const openUserChat = (u: OnlineUser) => {
    const tg = (window as any).Telegram?.WebApp
    if (u.username) {
      if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/${u.username}`)
      else window.open(`https://t.me/${u.username}`, '_blank')
    } else {
      if (tg?.openLink) tg.openLink(`tg://user?id=${u.userId}`)
    }
  }

  const cycleLang = () => setLang(l => l === 'uz' ? 'ru' : l === 'ru' ? 'en' : 'uz')

  if (loading) return (
    <div className="flex flex-col items-center justify-center bg-slate-900" style={{ height: '100dvh' }}>
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm">{t.loading}</p>
    </div>
  )
  if (error && !houses.length) return (
    <div className="flex flex-col items-center justify-center bg-slate-900 gap-4 px-6" style={{ height: '100dvh' }}>
      <p className="text-red-400 text-center text-sm">{error}</p>
      <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm" onClick={() => load(true)}>{t.retry}</button>
    </div>
  )

  return (
    <div className="flex flex-col bg-slate-900 text-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 flex-shrink-0">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-blue-400 uppercase">Mulk Invest</p>
          <p className="text-xs text-slate-400">{t.objects(filtered.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Online indikator — faqat admin uchun */}
          {isAdmin && onlineUsers.length > 0 && (
            <button
              onClick={() => { setTab('admin'); setAdminSubTab('online'); setSelected(null) }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-700/50 rounded-lg text-xs font-bold text-emerald-400 transition-colors">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {onlineUsers.length}
            </button>
          )}
          <button onClick={cycleLang}
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold tracking-wide transition-colors">
            {lang.toUpperCase()}
          </button>
          <button onClick={() => load(true)} disabled={syncing} className="text-slate-400 hover:text-white p-1 transition-colors">
            <IcRef s={syncing} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-800/70 border-b border-white/8 flex-shrink-0">
        {([
          { id: 'gallery' as Tab, label: t.gallery, I: IcGrid },
          { id: 'map' as Tab, label: t.mapTab, I: IcMap },
          { id: 'filter' as Tab, label: t.filter, I: IcFlt },
          ...(isAdmin ? [{ id: 'admin' as Tab, label: 'Admin', I: IcAdmin }] : []),
        ]).map(({ id, label, I }) => (
          <button key={id} onClick={() => { setTab(id); if (id !== 'map') setSelected(null) }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative transition-colors ${tab === id ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <I />
            {label}
            {id === 'filter' && fCount > 0 && (
              <span className="absolute top-1 right-[20%] w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                {fCount}
              </span>
            )}
            {id === 'admin' && isAdmin && onlineUsers.length > 0 && tab !== 'admin' && (
              <span className="absolute top-1 right-[20%] w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
            {tab === id && <span className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-400 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>

        {/* MAP — har doim mounted, faqat map tabda ko'rinadi */}
        <div className="absolute inset-0" style={{ display: tab === 'map' ? 'block' : 'none' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* GALLERY */}
        {tab === 'gallery' && (
          <div className="absolute inset-0 flex flex-col">
            <div className="px-3 py-2.5 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
                <span className="text-slate-500"><IcSrch /></span>
                <input type="search" placeholder={t.search} value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent flex-1 text-white placeholder-slate-500 outline-none"
                  style={{ fontSize: '16px' }} />
                {search && <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white"><IcX /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
                  <IcSrch /><p className="text-sm">{t.noResults}</p>
                  <button onClick={() => { setSearch(''); setFilters(EMPTY) }} className="text-blue-400 text-xs underline">{t.clearFilter}</button>
                </div>
              ) : filtered.map(h => <GCard key={h.id} h={h} t={t} onClick={() => openCard(h)} />)}
            </div>
          </div>
        )}

        {/* FILTER */}
        {tab === 'filter' && (
          <FPanel f={filters} setF={setFilters} t={t}
            districts={[...new Set(houses.map(h => h.district).filter(Boolean))].sort()}
            resultCount={filtered.length}
            onApply={() => { boundsSet.current = false; setTab('gallery') }}
            onReset={() => { setFilters(EMPTY); boundsSet.current = false }} />
        )}

        {/* ADMIN TAB */}
        {tab === 'admin' && isAdmin && (
          <div className="absolute inset-0 flex flex-col">

            {/* Sub-tabs */}
            <div className="flex gap-2 p-3 border-b border-white/8 flex-shrink-0">
              <button
                onClick={() => setAdminSubTab('online')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${adminSubTab === 'online'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`}>
                <span className={`w-2 h-2 rounded-full ${onlineUsers.length > 0 ? 'bg-emerald-300 animate-pulse' : 'bg-slate-500'}`} />
                Online ({onlineUsers.length})
              </button>
              <button
                onClick={() => setAdminSubTab('hidden')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${adminSubTab === 'hidden'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`}>
                🗂 Yashirilganlar
              </button>
            </div>

            {/* Online foydalanuvchilar */}
            {adminSubTab === 'online' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {onlineUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-56 gap-3 text-slate-500">
                    <span className="text-5xl">👤</span>
                    <p className="text-sm font-medium">Hozir hech kim yo'q</p>
                    <p className="text-xs text-slate-600 text-center px-4">Mini app ni ochgan foydalanuvchilar shu yerda ko'rinadi</p>
                  </div>
                )}
                {onlineUsers.map(u => (
                  <button key={u.userId}
                    onClick={() => openUserChat(u)}
                    className="w-full bg-slate-800 hover:bg-slate-750 active:bg-slate-700 rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors text-left border border-white/5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-xl font-bold select-none">
                        {(u.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-800 rounded-full" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug">
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Noma\'lum'}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {u.username ? `@${u.username}` : `ID: ${u.userId}`}
                      </p>
                    </div>
                    {/* Time + action */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-emerald-400 font-semibold">{secsAgo(u.lastSeen)}</p>
                      <p className="text-[10px] text-blue-400 mt-0.5">chat ochish →</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Yashirilgan uylar */}
            {adminSubTab === 'hidden' && <HiddenList />}
          </div>
        )}

        {/* CARD OVERLAY — istalgan tabda ko'rinadi */}
        {selected && (
          <MapCard
            house={selected} t={t}
            onClose={() => setSelected(null)}
            onShare={() => shareHouse(selected)}
            onLightboxOpen={(index, count) => setLightboxInfo({ crmId: selected.id, index, count })}
            isAdmin={isAdmin}
            onAdminHide={async () => {
              const tg = (window as any).Telegram?.WebApp
              const chatId = tg?.initDataUnsafe?.user?.id
              const initData = tg?.initData || ''
              await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'hide', chatId, initData, crmId: selected.id }),
              })
              setHouses(prev => prev.filter(h => h.id !== selected.id))
              setSelected(null)
            }}
            onAdminDeletePhoto={async (photoIndex: number) => {
              const tg = (window as any).Telegram?.WebApp
              const chatId = tg?.initDataUnsafe?.user?.id
              const initData = tg?.initData || ''
              const r = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete-photo', chatId, initData, crmId: selected.id, photoIndex }),
              })
              return (await r.json()).ok
            }}
            onAdminEdit={async (editData) => {
              const tg = (window as any).Telegram?.WebApp
              const chatId = tg?.initDataUnsafe?.user?.id
              const initData = tg?.initData || ''
              const r = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'edit', chatId, initData, crmId: selected.id, editData }),
              })
              const d = await r.json()
              if (d.ok) {
                const updated: House = {
                  ...selected,
                  title: editData.title || selected.title,
                  price: editData.price ? Number(editData.price) : selected.price,
                  rooms: editData.rooms ? Number(editData.rooms) : selected.rooms,
                  area: editData.area ? Number(editData.area) : selected.area,
                  floor: editData.floor ? Number(editData.floor) : selected.floor,
                  totalFloors: editData.totalFloors ? Number(editData.totalFloors) : selected.totalFloors,
                  district: editData.district ?? selected.district,
                  landmark: editData.landmark ?? selected.landmark,
                  description: editData.description ?? selected.description,
                }
                setHouses(prev => prev.map(h => h.id === selected.id ? updated : h))
                setSelected(updated)
              }
              return d.ok
            }}
          />
        )}
      </div>

      {/* LIGHTBOX */}
      {lightboxInfo && (
        <Lightbox
          crmId={lightboxInfo.crmId}
          initialIndex={lightboxInfo.index}
          count={lightboxInfo.count}
          onClose={() => setLightboxInfo(null)}
        />
      )}

      {showLeadForm && <LeadForm onClose={() => setShowLeadForm(false)} />}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .slide-up{animation:slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// PHOTO CAROUSEL
// ────────────────────────────────────────────────────────────
function PhotoCarousel({ crmId, onLightboxOpen, isAdmin, onDeletePhoto }: {
  crmId: number
  onLightboxOpen: (index: number, count: number) => void
  isAdmin?: boolean
  onDeletePhoto?: (photoIndex: number) => Promise<boolean>
}) {
  const [count, setCount] = useState(1)
  const [current, setCurrent] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchCount = () => {
    fetch(`/api/photo/${crmId}?count=1`)
      .then(r => r.json())
      .then(d => { if (typeof d.count === 'number') setCount(Math.max(1, d.count)) })
      .catch(() => { })
  }

  useEffect(() => { fetchCount() }, [crmId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth)
    setCurrent(Math.max(0, Math.min(idx, count - 1)))
  }

  const handleDelete = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (!onDeletePhoto || deleting) return
    setDeleting(true)
    const ok = await onDeletePhoto(index)
    if (ok) {
      const r = await fetch(`/api/photo/${crmId}?count=1`).catch(() => null)
      const d = r ? await r.json().catch(() => ({})) : {}
      const newCount = typeof d.count === 'number' ? Math.max(0, d.count) : Math.max(0, count - 1)
      setCount(newCount || 1)
      const newCurrent = Math.min(current, Math.max(0, newCount - 1))
      setCurrent(newCurrent)
      if (scrollRef.current) scrollRef.current.scrollLeft = newCurrent * scrollRef.current.offsetWidth
    }
    setDeleting(false)
  }

  return (
    <div className="relative bg-slate-800 rounded-2xl overflow-hidden mb-3" style={{ height: '220px' }}>
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex h-full"
        style={{ overflowX: 'scroll', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} onClick={() => onLightboxOpen(i, count)}
            style={{ minWidth: '100%', scrollSnapAlign: 'start', background: '#1e293b', cursor: 'zoom-in', position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photo/${crmId}?index=${i}`} alt=""
              className="w-full h-full"
              style={{ objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            {isAdmin && (
              <button
                onClick={e => handleDelete(e, i)}
                disabled={deleting}
                style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(220,38,38,0.88)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: 15, zIndex: 5, opacity: deleting ? 0.5 : 1 }}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {current + 1}/{count}
          </div>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} style={{
                width: i === current ? 16 : 6, height: 6,
                borderRadius: 3, background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// YANGA LIGHTBOX (SILLIQ SURILADIGAN)
// ────────────────────────────────────────────────────────────
function Lightbox({ crmId, initialIndex, count, onClose }: {
  crmId: number; initialIndex: number; count: number; onClose: () => void
}) {
  const [current, setCurrent] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  // Qanchalik ko'p surish kerakligi (sezuvchanlik)
  const minSwipeDistance = 45

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    setDragOffset(currentTouch - touchStart)
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    if (touchStart === null || touchEnd === null) {
      setDragOffset(0)
      return
    }
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && current < count - 1) {
      setCurrent(prev => prev + 1)
    } else if (isRightSwipe && current > 0) {
      setCurrent(prev => prev - 1)
    }
    setDragOffset(0)
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' }}>
      <button onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, color: 'white', fontSize: 28, cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none', zIndex: 10 }}>✕</button>

      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translateX(calc(${-current * 100}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{ minWidth: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photo/${crmId}?index=${i}`} alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 16, color: 'rgba(255,255,255,0.6)', fontSize: 13, pointerEvents: 'none' }}>
        {current + 1}/{count}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// MAP CARD (bottom sheet)
// ────────────────────────────────────────────────────────────
type EditFields = {
  title: string; price: string; rooms: string; area: string
  floor: string; totalFloors: string; district: string; landmark: string; description: string
}

function MapCard({ house: h, t, onClose, onShare, onLightboxOpen, isAdmin, onAdminHide, onAdminDeletePhoto, onAdminEdit }: {
  house: House; t: typeof T['uz']; onClose: () => void; onShare: () => void
  onLightboxOpen: (index: number, count: number) => void
  isAdmin?: boolean
  onAdminHide?: () => Promise<void>
  onAdminDeletePhoto?: (photoIndex: number) => Promise<boolean>
  onAdminEdit?: (data: EditFields) => Promise<boolean>
}) {
  const [hiding, setHiding] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<EditFields>({
    title: '', price: '', rooms: '', area: '', floor: '', totalFloors: '', district: '', landmark: '', description: '',
  })

  useEffect(() => {
    setEditMode(false)
    setEditData({
      title: h.title || '',
      price: h.price ? String(h.price) : '',
      rooms: h.rooms ? String(h.rooms) : '',
      area: h.area ? String(h.area) : '',
      floor: h.floor ? String(h.floor) : '',
      totalFloors: h.totalFloors ? String(h.totalFloors) : '',
      district: h.district || '',
      landmark: h.landmark || '',
      description: h.description || '',
    })
  }, [h.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k: keyof EditFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditData(p => ({ ...p, [k]: e.target.value }))

  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const dragging = useRef(false)

  const onTS = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    dragging.current = true
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  const onTM = (e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  const onTE = (e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return
    dragging.current = false
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 80) { onClose() } else {
      sheetRef.current.style.transition = 'transform 0.25s ease'
      sheetRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-40" style={{ bottom: '62dvh' }} onClick={onClose} />
      <div ref={sheetRef}
        className="slide-up absolute inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-3xl border-t border-white/10"
        style={{ height: '62dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Drag handle */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2"
          style={{ touchAction: 'none' }}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
          <div className="w-10 h-1.5 bg-slate-600 rounded-full" />
        </div>

        <button onClick={onClose} className="absolute top-2.5 right-3.5 text-slate-500 hover:text-white p-1.5 z-10">
          <IcX />
        </button>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <PhotoCarousel crmId={h.id} onLightboxOpen={onLightboxOpen} isAdmin={isAdmin} onDeletePhoto={onAdminDeletePhoto} />

          {h.jk && <span className="inline-block bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold mb-2">{h.jk}</span>}

          <div className="mb-3">
            <p className="text-xl font-bold text-blue-400">{priceStr(h.price)}</p>
            <p className="text-sm font-medium leading-snug mt-0.5">{h.title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">CRM #{h.id} {h.olx_id ? `| ${h.olx_id}` : ''}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {h.rooms > 0 && <Chip icon="🛏" l={t.rooms} v={t.rooms_n(h.rooms)} />}
            {h.area > 0 && <Chip icon="📐" l={t.area} v={t.area_n(h.area)} />}
            {h.floor > 0 && <Chip icon="🏢" l={t.floor} v={t.floor_n(h.floor, h.totalFloors || '?')} />}
            {h.district && <Chip icon="📍" l={t.district} v={h.district} />}
          </div>

          {h.landmark && <IRow l={`🗺 ${t.landmark}`} v={h.landmark} />}
          {h.description && <IRow l={t.desc} v={h.description} />}

          {h.yandex_url && (
            <a href={h.yandex_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 mb-3 hover:bg-slate-700 transition-colors">
              <span>📌</span>
              <span className="text-sm text-blue-400 font-medium">{t.mapLink}</span>
            </a>
          )}
        </div>

        {/* ── ADMIN PANEL ──────────────────────────────────── */}
        {isAdmin && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="bg-slate-800/80 border border-white/10 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">⚙ Admin</span>
                  <a href={`https://mulk.amocrm.ru/leads/detail/${h.id}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] text-blue-400 underline underline-offset-2">
                    CRM #{h.id} ↗
                  </a>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditMode(e => !e)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${editMode ? 'bg-slate-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                    {editMode ? '✕ Yopish' : '✏️ Tahrirlash'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!onAdminHide || hiding) return
                      setHiding(true)
                      await onAdminHide()
                      setHiding(false)
                    }}
                    disabled={hiding}
                    className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors">
                    {hiding ? '...' : '🙈 Yashir'}
                  </button>
                </div>
              </div>

              {/* Edit Form */}
              {editMode && (
                <div className="p-3 space-y-2" style={{ maxHeight: '40dvh', overflowY: 'auto' }}>
                  <EFld label="Nomi" value={editData.title} onChange={setField('title')} />
                  <div className="grid grid-cols-2 gap-2">
                    <EFld label="Narx ($)" value={editData.price} onChange={setField('price')} type="number" />
                    <EFld label="Xonalar" value={editData.rooms} onChange={setField('rooms')} type="number" />
                    <EFld label="Maydon (m²)" value={editData.area} onChange={setField('area')} type="number" />
                    <EFld label="Qavat" value={editData.floor} onChange={setField('floor')} type="number" />
                    <EFld label="Jami qavat" value={editData.totalFloors} onChange={setField('totalFloors')} type="number" />
                    <EFld label="Tuman" value={editData.district} onChange={setField('district')} />
                  </div>
                  <EFld label="Mo'ljal" value={editData.landmark} onChange={setField('landmark')} />
                  <EFld label="Tavsif" value={editData.description} onChange={setField('description')} multiline />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2.5 px-4 pt-2 pb-5 border-t border-white/8 flex-shrink-0">
          {isAdmin && editMode ? (
            <>
              <button onClick={() => setEditMode(false)}
                className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
                Bekor
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  if (!onAdminEdit || saving) return
                  setSaving(true)
                  const ok = await onAdminEdit(editData)
                  setSaving(false)
                  if (ok) setEditMode(false)
                }}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl text-sm font-semibold transition-colors">
                {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            </>
          ) : (
            <>
              <button onClick={onShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
                <IcShare />{t.share}
              </button>
              <button
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp;
                  const phone = '+998915514499';
                  const message = `Sotuvchi bilan bog'lanish uchun ushbu raqamga qo'ng'iroq qilasizmi: ${phone}?`;

                  if (tg && tg.showConfirm) {
                    tg.showConfirm(message, (isOk: boolean) => {
                      if (isOk) window.location.href = `tel:${phone}`;
                    });
                  } else {
                    if (window.confirm(message)) window.location.href = `tel:${phone}`;
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold text-white">
                <IcPhone />{t.contact}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────
// GALLERY CARD
// ────────────────────────────────────────────────────────────
function GCard({ h, t, onClick }: { h: House; t: typeof T['uz']; onClick: () => void }) {
  const [photoErr, setPhotoErr] = useState(false)
  return (
    <button onClick={onClick}
      className="w-full text-left bg-slate-800 rounded-2xl overflow-hidden border border-white/5 active:scale-[0.985] transition-transform">
      <div className="h-60 bg-gradient-to-br from-slate-700 to-slate-600 relative overflow-hidden">
        {!photoErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/photo/${h.id}`} alt={h.title}
            className="w-full h-full object-cover"
            onError={() => setPhotoErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
        {h.isTop && <span className="absolute top-2.5 left-2.5 bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ TOP</span>}
        {!h.isTop && h.jk && <span className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">{t.newTag}</span>}
        {h.price > 0 && <span className="absolute bottom-2.5 right-2.5 bg-black/65 text-white text-sm font-bold px-2.5 py-1 rounded-xl">{priceLbl(h.price)}</span>}
      </div>
      <div className="p-3.5">
        <p className="font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{h.title}</p>
        {(h.district || h.landmark) && <p className="text-xs text-slate-400 mb-2 truncate">📍 {h.district || h.landmark}</p>}
        <div className="flex gap-3 text-xs text-slate-300 flex-wrap">
          {h.rooms > 0 && <span>🛏 {t.rooms_n(h.rooms)}</span>}
          {h.area > 0 && <span>📐 {t.area_n(h.area)}</span>}
          {h.floor > 0 && <span>🏢 {t.floor_n(h.floor, h.totalFloors || '?')}</span>}
        </div>
      </div>
    </button>
  )
}

function Chip({ icon, l, v }: { icon: string; l: string; v: string }) {
  return <div className="bg-slate-800 rounded-xl px-3 py-2.5"><p className="text-[9px] text-slate-400 mb-0.5">{icon} {l}</p><p className="text-sm font-semibold">{v}</p></div>
}
function IRow({ l, v }: { l: string; v: string }) {
  return <div className="bg-slate-800 rounded-xl px-3.5 py-3 mb-2.5"><p className="text-[9px] text-slate-400 mb-0.5">{l}</p><p className="text-sm text-slate-200 leading-relaxed">{v}</p></div>
}
function EFld({ label, value, onChange, type = 'text', multiline = false }: {
  label: string; value: string; onChange: (e: any) => void; type?: string; multiline?: boolean
}) {
  const cls = "w-full bg-slate-700/60 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-white placeholder-slate-600 outline-none resize-none"
  return (
    <div>
      <p className="text-[10px] text-slate-400 mb-1 font-medium">{label}</p>
      {multiline
        ? <textarea value={value} onChange={onChange} rows={2} className={cls} style={{ fontSize: '16px' }} />
        : <input type={type} value={value} onChange={onChange} className={cls} style={{ fontSize: '16px' }} />
      }
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// HIDDEN LIST (admin tab inline)
// ────────────────────────────────────────────────────────────
function HiddenList() {
  const [list, setList] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id
    const initData = tg?.initData || ''
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-hidden', chatId, initData }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setList(d.hidden || []) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const restore = async (h: House) => {
    if (restoring) return
    const tg = (window as any).Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id
    const initData = tg?.initData || ''
    setRestoring(h.id)
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', chatId, initData, crmId: h.id }),
    }).catch(() => { })
    setList(prev => prev.filter(x => x.id !== h.id))
    setRestoring(null)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {list.length === 0 && (
        <div className="flex flex-col items-center justify-center h-56 gap-3 text-slate-500">
          <span className="text-5xl">🗂</span>
          <p className="text-sm font-medium">Yashirilgan uy yo'q</p>
        </div>
      )}
      {list.map(h => (
        <div key={h.id} className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{h.title || `#${h.id}`}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {[h.district, h.price ? `$${h.price.toLocaleString()}` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => restore(h)}
            disabled={restoring === h.id}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0">
            {restoring === h.id ? '...' : '↩ Qaytarish'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// FILTER PANEL
// ────────────────────────────────────────────────────────────
function FPanel({ f, setF, t, onApply, onReset, districts, resultCount }: {
  f: Filters; setF: React.Dispatch<React.SetStateAction<Filters>>
  t: typeof T['uz']; onApply: () => void; onReset: () => void
  districts?: string[]; resultCount: number
}) {
  const set = (k: keyof Filters) => (v: string) => setF(p => ({ ...p, [k]: v }))
  const distList = (districts && districts.length > 0) ? districts : DISTRICTS
  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-900" style={{ paddingBottom: '88px' }}>
      <div className="p-4 space-y-5">
        <Sec title={t.district}>
          <select className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white"
            style={{ fontSize: '16px' }} value={f.district} onChange={e => set('district')(e.target.value)}>
            <option value="">{t.allDistricts}</option>
            {distList.map(d => <option key={d} value={norm(d)}>{d}</option>)}
          </select>
        </Sec>

        <Sec title={t.type}>
          <div className="flex gap-2">
            {([
              { v: 'all' as const, l: t.all },
              { v: 'new' as const, l: t.newBuild },
              { v: 'secondary' as const, l: t.secondary },
            ]).map(o => (
              <button key={o.v} onClick={() => setF(p => ({ ...p, type: o.v }))}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${f.type === o.v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`} style={{ fontSize: '14px' }}>{o.l}</button>
            ))}
          </div>
        </Sec>

        <Sec title={t.rooms}>   <Rng mn={f.roomMin} mx={f.roomMax} oMn={set('roomMin')} oMx={set('roomMax')} t={t} /></Sec>
        <Sec title={t.area}>    <Rng mn={f.areaMin} mx={f.areaMax} oMn={set('areaMin')} oMx={set('areaMax')} t={t} /></Sec>
        <Sec title={t.floors}>  <Rng mn={f.floorsMin} mx={f.floorsMax} oMn={set('floorsMin')} oMx={set('floorsMax')} t={t} /></Sec>
        <Sec title={t.floor}>   <Rng mn={f.floorMin} mx={f.floorMax} oMn={set('floorMin')} oMx={set('floorMax')} t={t} /></Sec>
        <Sec title={t.price}>   <Rng mn={f.priceMin} mx={f.priceMax} oMn={set('priceMin')} oMx={set('priceMax')} t={t} /></Sec>
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/96 border-t border-white/10 px-4 pt-2 pb-4">
        <p className="text-center text-xs text-slate-400 mb-2">
          {resultCount > 0
            ? <span className="text-blue-400 font-semibold">{resultCount} ta ob'ekt topildi</span>
            : <span className="text-red-400">Hech narsa topilmadi</span>
          }
        </p>
        <div className="flex gap-3">
          <button onClick={onReset} className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">{t.reset}</button>
          <button onClick={onApply} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">{t.apply} →</button>
        </div>
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>{children}</div>
}
function Rng({ mn, mx, oMn, oMx, t }: { mn: string; mx: string; oMn: (v: string) => void; oMx: (v: string) => void; t: typeof T['uz'] }) {
  const cls = "flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
  return (
    <div className="flex gap-2 items-center">
      <input type="number" placeholder={t.from_} value={mn} onChange={e => oMn(e.target.value)} className={cls} style={{ fontSize: '16px' }} />
      <span className="text-slate-600 font-bold select-none">—</span>
      <input type="number" placeholder={t.to_} value={mx} onChange={e => oMx(e.target.value)} className={cls} style={{ fontSize: '16px' }} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// LEAD FORM (bottom sheet overlay, shown after 10s)
// ────────────────────────────────────────────────────────────
function LeadForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const tg = (typeof window !== 'undefined') ? (window as any).Telegram?.WebApp : null
  const user = tg?.initDataUnsafe?.user

  useEffect(() => {
    if (user?.first_name && !name) setName(user.first_name + (user.last_name ? ' ' + user.last_name : ''))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!phone.trim()) return
    setLoading(true)
    try {
      await fetch('/api/lead-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || user?.first_name || '',
          phone: phone.trim(),
          comment: comment.trim(),
          telegramId: user?.id,
          telegramUsername: user?.username,
        }),
      })
      setDone(true)
      try {
        const key = user?.id ? `lfts_${user.id}` : 'lfts'
        localStorage.setItem(key, String(Date.now()))
      } catch { }
      setTimeout(onClose, 2500)
    } catch { }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'flex-end' }}>
      <div className="slide-up" style={{ width: '100%', background: '#0f172a', borderRadius: '24px 24px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '0 0 32px' }}
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 6, borderRadius: 3, background: '#334155' }} />
        </div>

        {done ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>Muvaffaqiyatli yuborildi!</p>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>Tez orada mutaxassisimiz siz bilan bog'lanadi</p>
          </div>
        ) : (
          <div style={{ padding: '4px 20px 0' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>🏠 Kerakli uy haqida</p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Izlayotgan uyingiz haqida ma'lumot bering — mutaxassis yordam beradi</p>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ism</p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ismingiz..."
                style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Telefon raqam *</p>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+998 __ ___ __ __"
                style={{ width: '100%', background: '#1e293b', border: `1px solid ${!phone.trim() ? 'rgba(255,255,255,0.1)' : '#3b82f6'}`, borderRadius: 12, padding: '12px 14px', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Qanday uy kerak?</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Masalan: 2 xona, Yunusobod, $60,000 gacha..."
                rows={3}
                style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: 'white', fontSize: 16, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Keyinroq
              </button>
              <button
                onClick={submit}
                disabled={loading || !phone.trim()}
                style={{ flex: 2, padding: '14px', background: phone.trim() ? '#2563eb' : '#1e293b', border: 'none', borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 700, cursor: phone.trim() ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Yuborilmoqda...' : '📩 Yuborish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}