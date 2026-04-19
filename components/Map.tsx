'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// TUMANLAR ALIASES (filter uchun)
// ─────────────────────────────────────────────
const DISTRICT_ALIASES: Record<string, string[]> = {
  Yashnobod: ['яшнабад', 'yashnobod', 'yashno'],
  Yunusobod: ['юнусабад', 'yunusobod', 'yunusabad'],
  Chilonzor: ['чиланзар', 'chilonzor', 'chilangar'],
  Mirzo_Ulugbek: ['мирзо-улугбек', 'mirzo ulugbek', 'mirzo-ulugbek', 'mirzo'],
  Shayxontohur: ['шайхантахур', 'shayxontohur', 'shaykhantakhur'],
  Olmazor: ['алмазар', 'olmazor', 'almazar'],
  Bektemir: ['бектемир', 'bektemir'],
  Sergeli: ['сергели', 'sergeli'],
  Uchtepa: ['учтепа', 'uchtepa'],
  Yakkasaroy: ['яккасарай', 'yakkasaroy'],
  Shahar_markazi: ['центр', 'markaz', 'shahar markazi', 'city center'],
}

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
  location: string
  priceMin: string
  priceMax: string
  roomMin: string
  roomMax: string
  areaMin: string
  areaMax: string
  floor: string
}

const EMPTY_FILTERS: Filters = {
  location: '', priceMin: '', priceMax: '',
  roomMin: '', roomMax: '',
  areaMin: '', areaMax: '',
  floor: '',
}

// ─────────────────────────────────────────────
// NARX FORMATLASH
// ─────────────────────────────────────────────
function formatPrice(price: number): string {
  if (price === 0) return '—'
  // Agar narx dollar tartibida (kichik raqam) bo'lsa
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  // So'm (katta raqam)
  return (price / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln so\'m'
}

// Pin'dagi qisqa narx
function shortPrice(price: number): string {
  if (price === 0) return '?'
  if (price < 500_000) return `$${price.toLocaleString('en')}`
  return (price / 1_000_000).toFixed(0) + 'M'
}

const toNum = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0

// ─────────────────────────────────────────────
// ASOSIY KOMPONENT
// ─────────────────────────────────────────────
export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null)
  const ymapsRef = useRef<any>(null)
  const mapObjRef = useRef<any>(null)
  const ymapsReadyRef = useRef(false)

  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<House | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  // ── Lidlarni yuklash ──────────────────────────
  const loadHouses = useCallback(async (force = false) => {
    setSyncing(true)
    try {
      const url = force ? '/api/amo-leads?force=1' : '/api/amo-leads'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Server xato: ${res.status}`)
      const data: House[] = await res.json()
      setHouses(data)
      setLastSync(new Date())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  // Birinchi yuklash
  useEffect(() => { loadHouses() }, [loadHouses])

  // Avtomatik yangilanish — har 5 daqiqada
  useEffect(() => {
    const id = setInterval(() => loadHouses(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadHouses])

  // ── Yandex Maps SDK yuklash ───────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = () => {
      ; (window as any).ymaps.ready(() => {
        ymapsRef.current = (window as any).ymaps
        ymapsReadyRef.current = true
      })
    }

    if ((window as any).ymaps) { init(); return }

    const script = document.createElement('script')
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9e4db997-f532-41e0-8938-d905ec23cae7&lang=ru_RU'
    script.async = true
    script.onload = init
    document.head.appendChild(script)
  }, [])

  // ── Filter ────────────────────────────────────
  const filteredHouses = houses.filter(h => {
    if (filters.location) {
      const q = filters.location.toLowerCase().trim()
      const aliases = DISTRICT_ALIASES[filters.location] || [q]
      const hay = [h.title, h.district, h.landmark, h.description, h.jk]
        .join(' ').toLowerCase()
      const matched = hay.includes(q) ||
        h.id.toString().includes(q) ||
        aliases.some(a => hay.includes(a))
      if (!matched) return false
    }

    if (filters.priceMin && h.price < toNum(filters.priceMin)) return false
    if (filters.priceMax && h.price > toNum(filters.priceMax)) return false
    if (filters.roomMin && h.rooms < parseInt(filters.roomMin)) return false
    if (filters.roomMax && h.rooms > parseInt(filters.roomMax)) return false
    if (filters.areaMin && h.area < parseInt(filters.areaMin)) return false
    if (filters.areaMax && h.area > parseInt(filters.areaMax)) return false
    if (filters.floor && h.floor !== parseInt(filters.floor)) return false

    return true
  })

  // ── Xarita va pinlarni render ─────────────────
  useEffect(() => {
    if (!mapRef.current || !ymapsRef.current || !ymapsReadyRef.current) return

    const ymaps = ymapsRef.current

    ymaps.ready(() => {
      // Xaritani faqat bir marta yaratamiz
      if (!mapObjRef.current) {
        mapObjRef.current = new ymaps.Map(mapRef.current, {
          center: [41.2995, 69.2401],
          zoom: 12,
          controls: ['zoomControl', 'geolocationControl'],
        })
      }

      const map = mapObjRef.current
      map.geoObjects.removeAll()

      let added = 0

      filteredHouses.forEach(house => {
        // Koordinata validatsiyasi (O'zbekiston)
        if (
          !house.lat || !house.lng ||
          isNaN(house.lat) || isNaN(house.lng) ||
          house.lat < 37 || house.lat > 46 ||
          house.lng < 55 || house.lng > 74
        ) {
          console.warn(`⚠️ Lid ${house.id}: lat=${house.lat} lng=${house.lng}`)
          return
        }

        const placemark = new ymaps.Placemark(
          [house.lat, house.lng],
          {
            balloonContentHeader: house.title,
            balloonContentBody: `
              <div style="font-family:sans-serif;padding:4px;min-width:180px">
                <b style="font-size:15px">${formatPrice(house.price)}</b><br/>
                ${house.rooms ? `${house.rooms} xona` : ''} ${house.area ? `· ${house.area} m²` : ''} ${house.floor ? `· ${house.floor}-qavat` : ''}<br/>
                ${house.district ? `<span style="color:#666">${house.district}</span>` : ''}
              </div>
            `,
            hintContent: house.title,
          },
          {
            preset: 'islands#blueStretchyIcon',
            iconContent: shortPrice(house.price),
          },
        )

        placemark.events.add('click', () => setSelected(house))
        map.geoObjects.add(placemark)
        added++
      })

      // Barcha ko'rinadigan pinlarga zoom
      if (added > 0) {
        try {
          const bounds = map.geoObjects.getBounds()
          if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 })
        } catch { }
      }
    })
  }, [filteredHouses])

  // Komponent unmount — xaritani tozalash
  useEffect(() => {
    return () => {
      if (mapObjRef.current) {
        try { mapObjRef.current.destroy() } catch { }
        mapObjRef.current = null
      }
    }
  }, [])

  // ── Render ────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500">amoCRM'dan ma'lumotlar yuklanmoqda...</p>
    </div>
  )

  if (error && houses.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <p className="text-red-500 text-center px-6">{error}</p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        onClick={() => loadHouses(true)}
      >
        Qayta urinish
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-screen">

      {/* ── FILTER PANELI ── */}
      <div className="flex flex-wrap gap-2 p-3 bg-white border-b shadow-sm">

        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.location}
          onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
        >
          <option value="">Barcha tumanlar</option>
          {Object.keys(DISTRICT_ALIASES).map(d => (
            <option key={d} value={d}>{d.replace('_', ' ')}</option>
          ))}
        </select>

        <input type="number" placeholder="Narx dan"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.priceMin}
          onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value }))}
        />
        <input type="number" placeholder="Narx gacha"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.priceMax}
          onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))}
        />

        <input type="number" placeholder="Xona dan"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.roomMin}
          onChange={e => setFilters(f => ({ ...f, roomMin: e.target.value }))}
        />
        <input type="number" placeholder="Xona gacha"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.roomMax}
          onChange={e => setFilters(f => ({ ...f, roomMax: e.target.value }))}
        />

        <input type="number" placeholder="m² dan"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.areaMin}
          onChange={e => setFilters(f => ({ ...f, areaMin: e.target.value }))}
        />
        <input type="number" placeholder="m² gacha"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.areaMax}
          onChange={e => setFilters(f => ({ ...f, areaMax: e.target.value }))}
        />

        <input type="number" placeholder="Qavat"
          className="border rounded px-2 py-1 text-sm w-20"
          value={filters.floor}
          onChange={e => setFilters(f => ({ ...f, floor: e.target.value }))}
        />

        <button
          className="border rounded px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          Tozalash
        </button>

        {/* Yangilash tugmasi */}
        <button
          className={`border rounded px-3 py-1 text-sm flex items-center gap-1 ${syncing ? 'opacity-50' : 'hover:bg-blue-50 border-blue-300 text-blue-600'}`}
          onClick={() => loadHouses(true)}
          disabled={syncing}
        >
          {syncing ? '⟳ Yuklanmoqda...' : '⟳ Yangilash'}
        </button>

        <span className="ml-auto text-xs text-gray-400 self-center flex flex-col items-end">
          <span className="font-medium text-gray-600">{filteredHouses.length} ta ob'ekt</span>
          {lastSync && (
            <span>Yangilandi: {lastSync.toLocaleTimeString('uz-UZ')}</span>
          )}
        </span>
      </div>

      {/* ── XARITA ── */}
      <div className="flex flex-1 relative">
        <div ref={mapRef} className="flex-1" />

        {/* Tanlangan ob'ekt — info panel */}
        {selected && (
          <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-xl p-4 w-72 z-10 border border-gray-100">
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl leading-none"
              onClick={() => setSelected(null)}
            >×</button>

            <h3 className="font-semibold text-sm mb-2 pr-5 leading-snug">{selected.title}</h3>
            <p className="text-xl font-bold text-blue-600 mb-3">{formatPrice(selected.price)}</p>

            <div className="text-sm text-gray-600 space-y-1">
              {selected.rooms > 0 && <div>🏠 {selected.rooms} xona · {selected.area} m²</div>}
              {selected.floor > 0 && (
                <div>🏢 {selected.floor}/{selected.totalFloors || '?'}-qavat</div>
              )}
              {selected.jk && <div>🏗 JK: {selected.jk}</div>}
              {selected.district && <div>📍 {selected.district}</div>}
              {selected.landmark && <div>🗺 {selected.landmark}</div>}
              {selected.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-3 border-t pt-2">
                  {selected.description}
                </p>
              )}
            </div>

            {selected.yandex_url && (
              <a
                href={selected.yandex_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-sm bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition-colors"
              >
                Yandex Xaritada ko'rish ↗
              </a>
            )}

            <p className="text-xs text-gray-400 mt-2 text-center">
              CRM Lid #{selected.id}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
