'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// TUMANLAR
// ─────────────────────────────────────────────
const DISTRICTS = [
  'Yashnobod', 'Yunusobod', 'Chilonzor', 'Mirzo Ulugbek',
  'Shayxontohur', 'Olmazor', 'Bektemir', 'Sergeli',
  'Uchtepa', 'Yakkasaroy', 'Shahar markazi',
]

// ─────────────────────────────────────────────
// TIPLAR
// ─────────────────────────────────────────────
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
  roomMin: string
  roomMax: string
  areaMin: string
  areaMax: string
  type: 'all' | 'new' | 'secondary'
  floorsMin: string
  floorsMax: string
  floorMin: string
  floorMax: string
  priceMin: string
  priceMax: string
}

const EMPTY_FILTERS: Filters = {
  district: '', roomMin: '', roomMax: '',
  areaMin: '', areaMax: '', type: 'all',
  floorsMin: '', floorsMax: '', floorMin: '', floorMax: '',
  priceMin: '', priceMax: '',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatPrice(price: number): string {
  if (!price) return '—'
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  return (price / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln so\'m'
}

function shortPrice(price: number): string {
  if (!price) return '?'
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  return (price / 1_000_000).toFixed(0) + 'M'
}

const toNum = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0
const toFloat = (v: string) => parseFloat(v.replace(/[^\d.]/g, '')) || 0

// ─────────────────────────────────────────────
// FILTER matching
// ─────────────────────────────────────────────
function applyFilters(houses: House[], f: Filters): House[] {
  return houses.filter(h => {
    if (f.district) {
      const q = f.district.toLowerCase()
      const hay = [h.district, h.title, h.landmark, h.jk].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.roomMin && h.rooms < parseInt(f.roomMin)) return false
    if (f.roomMax && h.rooms > parseInt(f.roomMax)) return false
    if (f.areaMin && h.area < toFloat(f.areaMin)) return false
    if (f.areaMax && h.area > toFloat(f.areaMax)) return false
    if (f.floorsMin && h.totalFloors < parseInt(f.floorsMin)) return false
    if (f.floorsMax && h.totalFloors > parseInt(f.floorsMax)) return false
    if (f.floorMin && h.floor < parseInt(f.floorMin)) return false
    if (f.floorMax && h.floor > parseInt(f.floorMax)) return false
    if (f.priceMin && h.price < toNum(f.priceMin)) return false
    if (f.priceMax && h.price > toNum(f.priceMax)) return false
    if (f.type === 'new' && !h.jk) return false
    if (f.type === 'secondary' && h.jk) return false
    return true
  })
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────
function IconMap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function IconFilter() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Tab = 'map' | 'gallery' | 'filter'

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null)
  const ymapsRef = useRef<any>(null)
  const mapObjRef = useRef<any>(null)

  const [ymapsReady, setYmapsReady] = useState(false)
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<House | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<Tab>('map')

  const filteredHouses = applyFilters(houses, filters)
  const activeFiltersCount = Object.entries(filters).filter(([k, v]) =>
    k === 'type' ? v !== 'all' : v !== ''
  ).length

  // ── Telegram init ─────────────────────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [])

  // ── Load data ─────────────────────────────────
  const loadHouses = useCallback(async (force = false) => {
    setSyncing(true)
    try {
      const res = await fetch(force ? '/api/amo-leads?force=1' : '/api/amo-leads')
      if (!res.ok) throw new Error(`Server xato: ${res.status}`)
      const data: House[] = await res.json()
      setHouses(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => { loadHouses() }, [loadHouses])
  useEffect(() => {
    const id = setInterval(() => loadHouses(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadHouses])

  // ── Yandex Maps SDK ───────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const init = () => {
      ; (window as any).ymaps.ready(() => {
        ymapsRef.current = (window as any).ymaps
        setYmapsReady(true)
      })
    }
    if ((window as any).ymaps) { init(); return }
    const script = document.createElement('script')
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9e4db997-f532-41e0-8938-d905ec23cae7&lang=ru_RU'
    script.async = true
    script.onload = init
    document.head.appendChild(script)
  }, [])

  // ── Map render ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !ymapsRef.current || !ymapsReady) return

    const ymaps = ymapsRef.current
    ymaps.ready(() => {
      if (!mapObjRef.current) {
        mapObjRef.current = new ymaps.Map(mapRef.current, {
          center: [41.2995, 69.2401],
          zoom: 12,
          controls: ['zoomControl'],
        })
      }

      const map = mapObjRef.current
      map.geoObjects.removeAll()

      filteredHouses.forEach(house => {
        if (!house.lat || !house.lng || isNaN(house.lat) || isNaN(house.lng) ||
          house.lat < 37 || house.lat > 46 || house.lng < 55 || house.lng > 74) return

        const label = shortPrice(house.price)
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="38"><rect x="1" y="1" width="88" height="28" rx="14" fill="#3b82f6" stroke="white" stroke-width="1.5"/><text x="44" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="white">${label}</text><polygon points="36,29 44,38 52,29" fill="#3b82f6"/></svg>`

        const placemark = new ymaps.Placemark(
          [house.lat, house.lng],
          { hintContent: house.title },
          {
            iconLayout: 'default#imageWithContent',
            iconImageHref: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
            iconImageSize: [90, 38],
            iconImageOffset: [-45, -38],
          }
        )
        placemark.events.add('click', () => setSelected(house))
        map.geoObjects.add(placemark)
      })

      if (filteredHouses.length > 0) {
        try {
          const bounds = map.geoObjects.getBounds()
          if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 60 })
        } catch { }
      }
    })
  }, [filteredHouses, ymapsReady])

  // Re-init map size on tab switch
  useEffect(() => {
    if (activeTab === 'map') {
      setTimeout(() => {
        try { mapObjRef.current?.container?.fitToViewport() } catch { }
      }, 150)
    }
  }, [activeTab])

  useEffect(() => {
    return () => {
      if (mapObjRef.current) {
        try { mapObjRef.current.destroy() } catch { }
        mapObjRef.current = null
      }
    }
  }, [])

  // ── Share ─────────────────────────────────────
  const shareHouse = (house: House) => {
    const text = [
      `🏠 ${house.title}`,
      `💰 ${formatPrice(house.price)}`,
      house.rooms ? `🛏 ${house.rooms} xona` : '',
      house.area ? `📐 ${house.area} m²` : '',
      house.floor ? `🏢 ${house.floor}/${house.totalFloors || '?'}-qavat` : '',
      house.jk ? `🏗 JK: ${house.jk}` : '',
      house.district ? `📍 ${house.district}` : '',
      house.landmark ? `🗺 ${house.landmark}` : '',
      house.yandex_url ? `\n🔗 ${house.yandex_url}` : '',
    ].filter(Boolean).join('\n')

    const url = house.yandex_url || 'https://maps.yandex.uz'
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank'
    )
  }

  const callSeller = () => { window.location.href = 'tel:+998915514499' }

  // ─────────────────────────────────────────────
  // LOADING / ERROR
  // ─────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center bg-slate-900" style={{ height: '100dvh' }}>
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm">Ma'lumotlar yuklanmoqda...</p>
    </div>
  )

  if (error && houses.length === 0) return (
    <div className="flex flex-col items-center justify-center bg-slate-900 gap-4 px-6" style={{ height: '100dvh' }}>
      <p className="text-red-400 text-center text-sm">{error}</p>
      <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm" onClick={() => loadHouses(true)}>
        Qayta urinish
      </button>
    </div>
  )

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-slate-900 text-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-white uppercase">Mulk Invest</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filteredHouses.length} ta ob'ekt</p>
        </div>
        <button
          onClick={() => loadHouses(true)}
          disabled={syncing}
          className="text-slate-400 hover:text-white transition-colors p-1.5"
        >
          <IconRefresh spinning={syncing} />
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-slate-800/80 border-b border-white/10 flex-shrink-0">
        {([
          { id: 'gallery' as Tab, label: 'Galereya', Icon: IconGrid },
          { id: 'map' as Tab, label: 'Xaritada', Icon: IconMap },
          { id: 'filter' as Tab, label: 'Filtrlash', Icon: IconFilter },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-all relative ${activeTab === id ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Icon />
            {label}
            {id === 'filter' && activeFiltersCount > 0 && (
              <span className="absolute top-1.5 right-4 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {activeFiltersCount}
              </span>
            )}
            {activeTab === id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>

        {/* MAP */}
        <div
          className="absolute inset-0"
          style={{ display: activeTab === 'map' ? 'block' : 'none' }}
        >
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* GALLERY */}
        {activeTab === 'gallery' && (
          <div className="absolute inset-0 overflow-y-auto p-3 space-y-3">
            {filteredHouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-sm">Hech narsa topilmadi</p>
                <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-blue-400 text-xs underline">
                  Filtrni tozalash
                </button>
              </div>
            ) : filteredHouses.map(house => (
              <GalleryCard key={house.id} house={house} onClick={() => setSelected(house)} />
            ))}
          </div>
        )}

        {/* FILTER */}
        {activeTab === 'filter' && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onApply={() => setActiveTab('map')}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        )}
      </div>

      {/* ── DETAIL SHEET ── */}
      {selected && (
        <DetailSheet
          house={selected}
          onClose={() => setSelected(null)}
          onShare={() => shareHouse(selected)}
          onCall={callSeller}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .slide-up { animation: slideUp 0.28s cubic-bezier(0.34, 1.2, 0.64, 1) both; }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// GALLERY CARD
// ─────────────────────────────────────────────
function GalleryCard({ house, onClick }: { house: House; onClick: () => void }) {
  const priceLabel = house.price
    ? (house.price < 500_000 ? `$${house.price.toLocaleString('en')}` : `${(house.price / 1_000_000).toFixed(1)}M so'm`)
    : '—'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800 rounded-2xl overflow-hidden border border-white/5 active:scale-[0.98] transition-transform"
    >
      {/* Photo placeholder */}
      <div className="h-44 bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center relative">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {house.jk && (
          <span className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
            Yangi
          </span>
        )}
        <span className="absolute bottom-2.5 right-2.5 bg-black/65 text-white text-sm font-bold px-2.5 py-1 rounded-xl">
          {priceLabel}
        </span>
      </div>

      <div className="p-3.5">
        <p className="font-semibold text-sm leading-snug mb-2 line-clamp-2">{house.title}</p>

        <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{house.district || house.landmark || 'Toshkent'}</span>
        </div>

        <div className="flex gap-3 text-xs text-slate-300">
          {house.rooms > 0 && <span>🛏 {house.rooms} xona</span>}
          {house.area > 0 && <span>📐 {house.area} m²</span>}
          {house.floor > 0 && <span>🏢 {house.floor}/{house.totalFloors || '?'}</span>}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────
// DETAIL SHEET
// ─────────────────────────────────────────────
function DetailSheet({
  house, onClose, onShare, onCall
}: { house: House; onClose: () => void; onShare: () => void; onCall: () => void }) {
  const priceStr = house.price
    ? (house.price < 500_000
      ? `$${house.price.toLocaleString('en')}`
      : `${(house.price / 1_000_000).toFixed(1)} mln so'm`)
    : '—'

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="slide-up bg-slate-900 rounded-t-3xl border-t border-white/10 flex flex-col relative"
        style={{ maxHeight: '88dvh' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-4 text-slate-500 hover:text-white p-1 transition-colors">
          <IconClose />
        </button>

        {/* Scroll area */}
        <div className="overflow-y-auto flex-1 px-4 pt-1 pb-2">
          {/* Photo */}
          <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl mb-4 flex items-center justify-center relative">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {house.jk && (
              <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                Yangi qurilish
              </span>
            )}
          </div>

          {/* Price + name */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-blue-400 mb-1">{priceStr}</p>
            <h2 className="text-base font-semibold leading-snug text-white">{house.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">CRM #{house.id}</p>
          </div>

          {/* Info chips */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {house.rooms > 0 && <InfoChip icon="🛏" label="Xonalar" value={`${house.rooms} ta`} />}
            {house.area > 0 && <InfoChip icon="📐" label="Maydon" value={`${house.area} m²`} />}
            {house.floor > 0 && <InfoChip icon="🏢" label="Qavat" value={`${house.floor}/${house.totalFloors || '?'}`} />}
            {house.district && <InfoChip icon="📍" label="Tuman" value={house.district} />}
          </div>

          {/* JK */}
          {house.jk && (
            <InfoBlock label="Zhiloy Kompleks" value={house.jk} />
          )}

          {/* Landmark */}
          {house.landmark && (
            <InfoBlock label="Mo'ljal 🗺" value={house.landmark} />
          )}

          {/* Description */}
          {house.description && (
            <div className="bg-slate-800/80 rounded-xl px-3.5 py-3 mb-3">
              <p className="text-xs text-slate-400 mb-1">Tavsif</p>
              <p className="text-sm text-slate-300 leading-relaxed">{house.description}</p>
            </div>
          )}

          {/* Map link */}
          {house.yandex_url && (
            <a href={house.yandex_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3.5 py-3 mb-4 hover:bg-slate-700/80 transition-colors">
              <span>📍</span>
              <span className="text-sm text-blue-400 font-medium">Yandex Xaritada ko'rish ↗</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 px-4 py-3 border-t border-white/8 flex-shrink-0 pb-safe"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
          <button onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
            <IconShare />
            Ulashish
          </button>
          <button onClick={onCall}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">
            <IconPhone />
            Sotuvchi
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-800/80 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-sm">{icon}</span>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/80 rounded-xl px-3.5 py-3 mb-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// FILTER PANEL
// ─────────────────────────────────────────────
function FilterPanel({
  filters, setFilters, onApply, onReset
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onApply: () => void
  onReset: () => void
}) {
  const set = (key: keyof Filters) => (val: string) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-900"
      style={{ paddingBottom: 'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))' }}>
      <div className="p-4 space-y-5">

        <FilterSection title="Rayon">
          <select
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white"
            value={filters.district}
            onChange={e => set('district')(e.target.value)}
          >
            <option value="">Barcha tumanlar</option>
            {DISTRICTS.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        </FilterSection>

        <FilterSection title="Uy turi">
          <div className="flex gap-2">
            {([
              { val: 'all', label: 'Barchasi' },
              { val: 'new', label: 'Novostroyka' },
              { val: 'secondary', label: 'Vtorichka' },
            ] as const).map(opt => (
              <button
                key={opt.val}
                onClick={() => setFilters(f => ({ ...f, type: opt.val }))}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${filters.type === opt.val
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Xonalar soni">
          <RangeRow
            minVal={filters.roomMin} maxVal={filters.roomMax}
            onMin={set('roomMin')} onMax={set('roomMax')}
          />
        </FilterSection>

        <FilterSection title="Kvadratura (m²)">
          <RangeRow
            minVal={filters.areaMin} maxVal={filters.areaMax}
            onMin={set('areaMin')} onMax={set('areaMax')}
          />
        </FilterSection>

        <FilterSection title="Umumiy qavatlar">
          <RangeRow
            minVal={filters.floorsMin} maxVal={filters.floorsMax}
            onMin={set('floorsMin')} onMax={set('floorsMax')}
          />
        </FilterSection>

        <FilterSection title="Qavat">
          <RangeRow
            minVal={filters.floorMin} maxVal={filters.floorMax}
            onMin={set('floorMin')} onMax={set('floorMax')}
          />
        </FilterSection>

        <FilterSection title="Narx ($)">
          <RangeRow
            minVal={filters.priceMin} maxVal={filters.priceMax}
            onMin={set('priceMin')} onMax={set('priceMax')}
          />
        </FilterSection>
      </div>

      {/* Fixed apply/reset */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-3 px-4 py-3 bg-slate-900/95 border-t border-white/10"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        <button onClick={onReset}
          className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-sm font-semibold transition-colors">
          Tozalash
        </button>
        <button onClick={onApply}
          className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-semibold transition-colors">
          Qo'llash →
        </button>
      </div>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function RangeRow({
  minVal, maxVal, onMin, onMax
}: { minVal: string; maxVal: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input type="number" placeholder="dan"
        value={minVal} onChange={e => onMin(e.target.value)}
        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none"
      />
      <span className="text-slate-600 font-bold">—</span>
      <input type="number" placeholder="gacha"
        value={maxVal} onChange={e => onMax(e.target.value)}
        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none"
      />
    </div>
  )
}
