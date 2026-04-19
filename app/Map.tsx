'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ────────────────────────────────────────────────────────────
// TRANSLATIONS
// ────────────────────────────────────────────────────────────
type Lang = 'uz' | 'ru' | 'en'
const T = {
  uz: {
    gallery: 'Galereya', mapTab: 'Xaritada', filter: 'Filtrlash',
    search: "Nom yoki manzil bo'yicha...",
    objects: (n: number) => `${n} ta ob'ekt`,
    allDistricts: 'Barcha tumanlar',
    all: 'Barchasi', newBuild: 'Novostroyka', secondary: 'Vtorichka',
    rooms: 'Xonalar', area: 'Kvadratura (m²)', floors: 'Umumiy qavatlar',
    floor: 'Qavat', price: "Narx", district: 'Rayon', type: 'Uy turi',
    apply: "Qo'llash", reset: 'Tozalash',
    loading: "Ma'lumotlar yuklanmoqda...", retry: 'Qayta urinish',
    noResults: 'Hech narsa topilmadi', clearFilter: 'Filtrni tozalash',
    share: 'Ulashish', contact: 'Sotuvchi bilan aloqa',
    mapLink: "Yandex Xaritada ko'rish ↗",
    desc: 'Tavsif', landmark: "Mo'ljal", jk: 'Zhiloy Kompleks',
    from_: 'dan', to_: 'gacha',
    rooms_n: (n: number) => `${n} xona`,
    floor_n: (f: number, t: number | string) => `${f}/${t}-qavat`,
    area_n: (a: number) => `${a} m²`,
    newTag: 'Yangi', serverError: 'Server xato',
  },
  ru: {
    gallery: 'Галерея', mapTab: 'На карте', filter: 'Фильтры',
    search: 'Поиск по названию или адресу...',
    objects: (n: number) => `${n} объектов`,
    allDistricts: 'Все районы',
    all: 'Все', newBuild: 'Новостройка', secondary: 'Вторичка',
    rooms: 'Комнат', area: 'Площадь (м²)', floors: 'Этажей всего',
    floor: 'Этаж', price: 'Цена', district: 'Район', type: 'Тип',
    apply: 'Применить', reset: 'Сбросить',
    loading: 'Загрузка данных...', retry: 'Повторить',
    noResults: 'Ничего не найдено', clearFilter: 'Сбросить фильтры',
    share: 'Поделиться', contact: 'Связаться с продавцом',
    mapLink: 'Открыть на Яндекс Картах ↗',
    desc: 'Описание', landmark: 'Ориентир', jk: 'Жилой Комплекс',
    from_: 'от', to_: 'до',
    rooms_n: (n: number) => `${n} комн`,
    floor_n: (f: number, t: number | string) => `${f}/${t} эт`,
    area_n: (a: number) => `${a} м²`,
    newTag: 'Новый', serverError: 'Ошибка сервера',
  },
  en: {
    gallery: 'Gallery', mapTab: 'Map', filter: 'Filter',
    search: 'Search by name or address...',
    objects: (n: number) => `${n} properties`,
    allDistricts: 'All Districts',
    all: 'All', newBuild: 'New Build', secondary: 'Secondary',
    rooms: 'Rooms', area: 'Area (m²)', floors: 'Total Floors',
    floor: 'Floor', price: 'Price', district: 'District', type: 'Type',
    apply: 'Apply', reset: 'Reset',
    loading: 'Loading data...', retry: 'Retry',
    noResults: 'Nothing found', clearFilter: 'Clear filters',
    share: 'Share', contact: 'Contact Seller',
    mapLink: 'View on Yandex Maps ↗',
    desc: 'Description', landmark: 'Landmark', jk: 'Residential Complex',
    from_: 'from', to_: 'to',
    rooms_n: (n: number) => `${n} rooms`,
    floor_n: (f: number, t: number | string) => `${f}/${t}F`,
    area_n: (a: number) => `${a} m²`,
    newTag: 'New', serverError: 'Server error',
  },
}

// ────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────
const DISTRICTS = [
  'Yashnobod', 'Yunusobod', 'Chilonzor', 'Mirzo Ulugbek',
  'Shayxontohur', 'Olmazor', 'Bektemir', 'Sergeli',
  'Uchtepa', 'Yakkasaroy', 'Shahar markazi',
]
const SELLER_PHONE = '+998915514499'
const ZOOM_LABEL_THRESHOLD = 14  // show price labels above this zoom

// ────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────
interface House {
  id: number
  title: string
  lat: number
  lng: number
  price: number
  rooms: number
  area: number
  floor: number
  totalFloors: number
  district: string
  description: string
  landmark: string
  jk: string
  yandex_url: string
  updatedAt: number
}

interface Filters {
  district: string
  roomMin: string; roomMax: string
  areaMin: string; areaMax: string
  type: 'all' | 'new' | 'secondary'
  floorsMin: string; floorsMax: string
  floorMin: string; floorMax: string
  priceMin: string; priceMax: string
}

const EMPTY_FILTERS: Filters = {
  district: '', roomMin: '', roomMax: '',
  areaMin: '', areaMax: '', type: 'all',
  floorsMin: '', floorsMax: '', floorMin: '', floorMax: '',
  priceMin: '', priceMax: '',
}

type Tab = 'gallery' | 'map' | 'filter'

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
function priceLbl(price: number): string {
  if (!price) return '?'
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  return `${(price / 1_000_000).toFixed(0)}M`
}
function priceStr(price: number): string {
  if (!price) return '—'
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  return `${(price / 1_000_000).toFixed(1)} mln so'm`
}

function isValidCoord(h: House) {
  return h.lat && h.lng && !isNaN(h.lat) && !isNaN(h.lng) &&
    h.lat >= 37 && h.lat <= 46 && h.lng >= 55 && h.lng <= 74
}

function applyFilters(houses: House[], f: Filters, search: string): House[] {
  return houses.filter(h => {
    if (search) {
      const q = search.toLowerCase()
      if (![h.title, h.district, h.landmark, h.jk, h.description].join(' ').toLowerCase().includes(q)) return false
    }
    if (f.district) {
      const q = f.district.toLowerCase()
      if (![h.district, h.title, h.landmark, h.jk].join(' ').toLowerCase().includes(q)) return false
    }
    if (f.roomMin && h.rooms < parseInt(f.roomMin)) return false
    if (f.roomMax && h.rooms > parseInt(f.roomMax)) return false
    if (f.areaMin && h.area < parseFloat(f.areaMin)) return false
    if (f.areaMax && h.area > parseFloat(f.areaMax)) return false
    if (f.floorsMin && h.totalFloors < parseInt(f.floorsMin)) return false
    if (f.floorsMax && h.totalFloors > parseInt(f.floorsMax)) return false
    if (f.floorMin && h.floor < parseInt(f.floorMin)) return false
    if (f.floorMax && h.floor > parseInt(f.floorMax)) return false
    if (f.priceMin && h.price < parseInt(f.priceMin)) return false
    if (f.priceMax && h.price > parseInt(f.priceMax)) return false
    if (f.type === 'new' && !h.jk) return false
    if (f.type === 'secondary' && h.jk) return false
    return true
  })
}

function activeFilterCount(f: Filters): number {
  return Object.entries(f).filter(([k, v]) => k === 'type' ? v !== 'all' : v !== '').length
}

// ────────────────────────────────────────────────────────────
// MAP MARKER BUILDERS
// ────────────────────────────────────────────────────────────
function buildPriceSvg(label: string): string {
  const w = Math.max(70, label.length * 9 + 24)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="36">` +
    `<rect x="1" y="1" width="${w - 2}" height="26" rx="13" fill="#3b82f6" stroke="white" stroke-width="1.5"/>` +
    `<text x="${w / 2}" y="19" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white">${label}</text>` +
    `<polygon points="${w / 2 - 6},27 ${w / 2},36 ${w / 2 + 6},27" fill="#3b82f6"/>` +
    `</svg>`
}

function buildDotSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">` +
    `<circle cx="7" cy="7" r="6" fill="#3b82f6" stroke="white" stroke-width="1.5"/>` +
    `</svg>`
}

// ────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────
function IcGrid() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IcMap() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
}
function IcFilter() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
}
function IcPhone() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
}
function IcShare() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}
function IcClose() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IcSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IcRefresh({ spin }: { spin: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spin ? 'spin 1s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export default function MapPage() {
  const mapRef     = useRef<HTMLDivElement>(null)
  const ymapsRef   = useRef<any>(null)
  const mapObjRef  = useRef<any>(null)
  const boundsSet  = useRef(false)
  const markersRef = useRef<any[]>([])

  const [ymapsReady, setYmapsReady] = useState(false)
  const [houses,   setHouses]   = useState<House[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [selected, setSelected] = useState<House | null>(null)
  const [syncing,  setSyncing]  = useState(false)
  const [filters,  setFilters]  = useState<Filters>(EMPTY_FILTERS)
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState<Tab>('gallery')
  const [lang,     setLang]     = useState<Lang>('uz')

  const t = T[lang]
  const filtered = applyFilters(houses, filters, search)
  const filterCount = activeFilterCount(filters)

  // ── Telegram init ──────────────────────────────────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand() }
  }, [])

  // ── Data ──────────────────────────────────────────────────
  const load = useCallback(async (force = false) => {
    setSyncing(true)
    try {
      const res = await fetch(force ? '/api/amo-leads?force=1' : '/api/amo-leads')
      if (!res.ok) throw new Error(`${t.serverError}: ${res.status}`)
      setHouses(await res.json())
      setError(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setSyncing(false) }
  }, [t.serverError])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(() => load(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  // ── Yandex Maps SDK ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const init = () => (window as any).ymaps.ready(() => {
      ymapsRef.current = (window as any).ymaps
      setYmapsReady(true)
    })
    if ((window as any).ymaps) return init()
    const s = document.createElement('script')
    s.src = 'https://api-maps.yandex.ru/2.1/?apikey=9e4db997-f532-41e0-8938-d905ec23cae7&lang=ru_RU'
    s.async = true; s.onload = init
    document.head.appendChild(s)
  }, [])

  // ── Render markers (zoom-aware) ────────────────────────────
  const renderMarkers = useCallback((zoom: number) => {
    const ymaps = ymapsRef.current
    const map = mapObjRef.current
    if (!ymaps || !map) return

    markersRef.current.forEach(p => {
      try { map.geoObjects.remove(p) } catch {}
    })
    markersRef.current = []

    filtered.forEach(house => {
      if (!isValidCoord(house)) return

      const useLabel = zoom >= ZOOM_LABEL_THRESHOLD
      const svg = useLabel ? buildPriceSvg(priceLbl(house.price)) : buildDotSvg()
      const w = useLabel ? Math.max(70, priceLbl(house.price).length * 9 + 24) : 14
      const h2 = useLabel ? 36 : 14

      const pm = new ymaps.Placemark(
        [house.lat, house.lng],
        { hintContent: house.title },
        {
          iconLayout: 'default#imageWithContent',
          iconImageHref: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
          iconImageSize: [w, h2],
          iconImageOffset: useLabel ? [-w / 2, -h2] : [-7, -7],
        }
      )
      pm.events.add('click', () => setSelected(house))
      map.geoObjects.add(pm)
      markersRef.current.push(pm)
    })
  }, [filtered])

  // ── Init/update map ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !ymapsReady || !ymapsRef.current) return

    const ymaps = ymapsRef.current
    ymaps.ready(() => {
      if (!mapObjRef.current) {
        mapObjRef.current = new ymaps.Map(mapRef.current, {
          center: [41.2995, 69.2401], zoom: 12,
          controls: ['zoomControl'],
        })
        mapObjRef.current.events.add('boundschange', (e: any) => {
          if (e.get('newZoom') !== e.get('oldZoom')) {
            renderMarkers(mapObjRef.current.getZoom())
          }
        })
      }

      renderMarkers(mapObjRef.current.getZoom())

      // Set bounds only once on initial data load
      if (!boundsSet.current && filtered.length > 0) {
        try {
          const bounds = mapObjRef.current.geoObjects.getBounds()
          if (bounds) {
            mapObjRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 80 })
            boundsSet.current = true
          }
        } catch {}
      }
    })
  }, [filtered, ymapsReady, renderMarkers])

  // Re-fit map when switching to map tab
  useEffect(() => {
    if (tab === 'map') {
      setTimeout(() => {
        try { mapObjRef.current?.container?.fitToViewport() } catch {}
      }, 150)
    }
  }, [tab])

  useEffect(() => () => {
    try { mapObjRef.current?.destroy() } catch {}
    mapObjRef.current = null
  }, [])

  // ── Share ──────────────────────────────────────────────────
  const share = (h: House) => {
    const lines = [
      `🏠 ${h.title}`,
      `🆔 CRM ID: ${h.id}`,
      `💰 ${priceStr(h.price)}`,
      h.rooms      ? `🛏 ${t.rooms_n(h.rooms)}`          : '',
      h.area       ? `📐 ${t.area_n(h.area)}`             : '',
      h.floor      ? `🏢 ${t.floor_n(h.floor, h.totalFloors || '?')}` : '',
      h.jk         ? `🏗 JK: ${h.jk}`                    : '',
      h.district   ? `📍 ${h.district}`                   : '',
      h.landmark   ? `🗺 ${h.landmark}`                   : '',
    ].filter(Boolean).join('\n')

    const url = h.yandex_url || ''
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(lines)}`,
      '_blank'
    )
  }

  const call = () => { window.location.href = `tel:${SELLER_PHONE}` }

  const cycleLang = () => {
    setLang(l => l === 'uz' ? 'ru' : l === 'ru' ? 'en' : 'uz')
  }

  // ── Loading / Error ────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-slate-900 text-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/8 flex-shrink-0">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-blue-400 uppercase">Mulk Invest</p>
          <p className="text-xs text-slate-400">{t.objects(filtered.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button onClick={cycleLang}
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-200 transition-colors tracking-wide">
            {lang.toUpperCase()}
          </button>
          {/* Refresh */}
          <button onClick={() => load(true)} disabled={syncing}
            className="text-slate-400 hover:text-white transition-colors p-1">
            <IcRefresh spin={syncing} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-800/70 border-b border-white/8 flex-shrink-0">
        {([
          { id: 'gallery' as Tab, label: t.gallery, Icon: IcGrid   },
          { id: 'map'     as Tab, label: t.mapTab,  Icon: IcMap    },
          { id: 'filter'  as Tab, label: t.filter,  Icon: IcFilter },
        ]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative transition-colors ${
              tab === id ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon />
            {label}
            {id === 'filter' && filterCount > 0 && (
              <span className="absolute top-1 right-[22%] w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
            {tab === id && <span className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-400 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>

        {/* MAP */}
        <div className="absolute inset-0" style={{ display: tab === 'map' ? 'block' : 'none' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* GALLERY */}
        {tab === 'gallery' && (
          <div className="absolute inset-0 flex flex-col">
            {/* Search bar */}
            <div className="px-3 py-2.5 bg-slate-900 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
                <span className="text-slate-500"><IcSearch /></span>
                <input
                  type="search"
                  placeholder={t.search}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent flex-1 text-white placeholder-slate-500 outline-none"
                  style={{ fontSize: '16px' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white">
                    <IcClose />
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
                  <IcSearch />
                  <p className="text-sm">{t.noResults}</p>
                  <button onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS) }}
                    className="text-blue-400 text-xs underline">{t.clearFilter}</button>
                </div>
              ) : filtered.map(h => (
                <GalleryCard key={h.id} house={h} t={t} onClick={() => {
                  setSelected(h)
                  setTab('map')
                }} />
              ))}
            </div>
          </div>
        )}

        {/* FILTER */}
        {tab === 'filter' && (
          <FilterPanel filters={filters} setFilters={setFilters} t={t} lang={lang}
            onApply={() => { boundsSet.current = false; setTab('map') }}
            onReset={() => { setFilters(EMPTY_FILTERS); boundsSet.current = false }} />
        )}
      </div>

      {/* DETAIL SHEET */}
      {selected && (
        <DetailSheet house={selected} t={t}
          onClose={() => setSelected(null)}
          onShare={() => share(selected)}
          onCall={call} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1) both; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// GALLERY CARD
// ────────────────────────────────────────────────────────────
function GalleryCard({ house: h, t, onClick }: {
  house: House
  t: typeof T['uz']
  onClick: () => void
}) {
  const pl = priceLbl(h.price)
  return (
    <button onClick={onClick}
      className="w-full text-left bg-slate-800 rounded-2xl overflow-hidden border border-white/5 active:scale-[0.985] transition-transform">
      <div className="h-44 bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center relative">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        {h.jk && <span className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">{t.newTag}</span>}
        {h.price > 0 && <span className="absolute bottom-2.5 right-2.5 bg-black/65 text-white text-sm font-bold px-2.5 py-1 rounded-xl">{pl}</span>}
      </div>
      <div className="p-3.5">
        <p className="font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{h.title}</p>
        {(h.district || h.landmark) && (
          <p className="text-xs text-slate-400 mb-2 truncate">📍 {h.district || h.landmark}</p>
        )}
        <div className="flex gap-3 text-xs text-slate-300 flex-wrap">
          {h.rooms > 0 && <span>🛏 {t.rooms_n(h.rooms)}</span>}
          {h.area  > 0 && <span>📐 {t.area_n(h.area)}</span>}
          {h.floor > 0 && <span>🏢 {t.floor_n(h.floor, h.totalFloors || '?')}</span>}
        </div>
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// DETAIL SHEET (with swipe-to-close)
// ────────────────────────────────────────────────────────────
function DetailSheet({ house: h, t, onClose, onShare, onCall }: {
  house: House
  t: typeof T['uz']
  onClose: () => void
  onShare: () => void
  onCall: () => void
}) {
  const sheetRef  = useRef<HTMLDivElement>(null)
  const startY    = useRef(0)
  const dragging  = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    dragging.current = true
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return
    dragging.current = false
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 90) {
      onClose()
    } else {
      sheetRef.current.style.transition = 'transform 0.25s ease'
      sheetRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div ref={sheetRef}
        className="slide-up bg-slate-900 rounded-t-3xl border-t border-white/10 flex flex-col relative"
        style={{ maxHeight: '88dvh' }}>

        {/* Drag handle — touch area */}
        <div
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-9 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-3 right-4 text-slate-500 hover:text-white p-1 transition-colors z-10">
          <IcClose />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-2">
          {/* Photo placeholder */}
          <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl mb-4 flex items-center justify-center relative">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {h.jk && (
              <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                {h.jk}
              </span>
            )}
          </div>

          {/* Price + Title */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-blue-400 mb-1">{priceStr(h.price)}</p>
            <h2 className="text-base font-semibold leading-snug">{h.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">CRM #{h.id}</p>
          </div>

          {/* Info chips */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {h.rooms > 0 && <Chip icon="🛏" label={t.rooms} val={t.rooms_n(h.rooms)} />}
            {h.area  > 0 && <Chip icon="📐" label={t.area}  val={t.area_n(h.area)} />}
            {h.floor > 0 && <Chip icon="🏢" label={t.floor} val={t.floor_n(h.floor, h.totalFloors || '?')} />}
            {h.district && <Chip icon="📍" label={t.district} val={h.district} />}
          </div>

          {h.landmark && <InfoRow label={`🗺 ${t.landmark}`} val={h.landmark} />}
          {h.description && <InfoRow label={t.desc} val={h.description} />}

          {h.yandex_url && (
            <a href={h.yandex_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-slate-800 rounded-xl px-3.5 py-3 mb-4 hover:bg-slate-700 transition-colors">
              <span>📍</span>
              <span className="text-sm text-blue-400 font-medium">{t.mapLink}</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 px-4 pt-2 pb-5 border-t border-white/8 flex-shrink-0">
          <button onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
            <IcShare />{t.share}
          </button>
          <button onClick={onCall}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">
            <IcPhone />{t.contact}
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <div className="bg-slate-800 rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-slate-400 mb-0.5">{icon} {label}</p>
      <p className="text-sm font-semibold">{val}</p>
    </div>
  )
}
function InfoRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="bg-slate-800 rounded-xl px-3.5 py-3 mb-3">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-200 leading-relaxed">{val}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// FILTER PANEL
// ────────────────────────────────────────────────────────────
function FilterPanel({ filters: f, setFilters, t, lang, onApply, onReset }: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  t: typeof T['uz']
  lang: Lang
  onApply: () => void
  onReset: () => void
}) {
  const set = (k: keyof Filters) => (v: string) => setFilters(p => ({ ...p, [k]: v }))
  const INPUT = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-600 focus:border-blue-500 outline-none"

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-900"
      style={{ paddingBottom: '90px' }}>
      <div className="p-4 space-y-5">

        <Sec title={t.district}>
          <select className={INPUT} value={f.district} onChange={e => set('district')(e.target.value)}
            style={{ fontSize: '16px' }}>
            <option value="">{t.allDistricts}</option>
            {DISTRICTS.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        </Sec>

        <Sec title={t.type}>
          <div className="flex gap-2">
            {([
              { v: 'all' as const,       label: t.all      },
              { v: 'new' as const,       label: t.newBuild },
              { v: 'secondary' as const, label: t.secondary },
            ]).map(o => (
              <button key={o.v} onClick={() => setFilters(p => ({ ...p, type: o.v }))}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  f.type === o.v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-white/10'
                }`} style={{ fontSize: '14px' }}>
                {o.label}
              </button>
            ))}
          </div>
        </Sec>

        <Sec title={t.rooms}>
          <Range minV={f.roomMin} maxV={f.roomMax} onMin={set('roomMin')} onMax={set('roomMax')} t={t} />
        </Sec>
        <Sec title={t.area}>
          <Range minV={f.areaMin} maxV={f.areaMax} onMin={set('areaMin')} onMax={set('areaMax')} t={t} />
        </Sec>
        <Sec title={t.floors}>
          <Range minV={f.floorsMin} maxV={f.floorsMax} onMin={set('floorsMin')} onMax={set('floorsMax')} t={t} />
        </Sec>
        <Sec title={t.floor}>
          <Range minV={f.floorMin} maxV={f.floorMax} onMin={set('floorMin')} onMax={set('floorMax')} t={t} />
        </Sec>
        <Sec title={t.price}>
          <Range minV={f.priceMin} maxV={f.priceMax} onMin={set('priceMin')} onMax={set('priceMax')} t={t} />
        </Sec>
      </div>

      <div className="fixed bottom-0 inset-x-0 flex gap-3 px-4 py-3 bg-slate-900/96 border-t border-white/10">
        <button onClick={onReset}
          className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
          {t.reset}
        </button>
        <button onClick={onApply}
          className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">
          {t.apply}
        </button>
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function Range({ minV, maxV, onMin, onMax, t }: {
  minV: string; maxV: string
  onMin: (v: string) => void; onMax: (v: string) => void
  t: typeof T['uz']
}) {
  return (
    <div className="flex gap-2 items-center">
      <input type="number" placeholder={t.from_} value={minV} onChange={e => onMin(e.target.value)}
        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        style={{ fontSize: '16px' }} />
      <span className="text-slate-600 font-bold select-none">—</span>
      <input type="number" placeholder={t.to_} value={maxV} onChange={e => onMax(e.target.value)}
        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        style={{ fontSize: '16px' }} />
    </div>
  )
}
