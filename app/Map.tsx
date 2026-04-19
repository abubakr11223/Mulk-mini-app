'use client'

import { useEffect, useRef, useState } from 'react'

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
  price: number        // so'm
  rooms: number
  area: number
  floor: number
  totalFloors: number
  district: string
  description: string
  landmark: string
  yandex_url?: string
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

// ─────────────────────────────────────────────
// amoCRM DAN LIDLARNI OLISH
// (server action yoki API route orqali)
// ─────────────────────────────────────────────
async function fetchHousesFromAmo(): Promise<House[]> {
  try {
    const res = await fetch('/api/amo-leads')
    if (!res.ok) throw new Error('API xato')
    const data: House[] = await res.json()
    return data
  } catch (e) {
    console.error('Lidlarni olishda xato:', e)
    return []
  }
}

// ─────────────────────────────────────────────
// YORDAMCHI: raqam
// ─────────────────────────────────────────────
const toNum = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0

// ─────────────────────────────────────────────
// ASOSIY KOMPONENT
// ─────────────────────────────────────────────
export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null)
  const ymapsRef = useRef<any>(null)
  const mapObjRef = useRef<any>(null)

  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<House | null>(null)

  const [filters, setFilters] = useState<Filters>({
    location: '',
    priceMin: '', priceMax: '',
    roomMin: '', roomMax: '',
    areaMin: '', areaMax: '',
    floor: '',
  })

  // ── 1. Lidlarni yuklash ──────────────────────
  useEffect(() => {
    fetchHousesFromAmo().then(data => {
      setHouses(data)
      setLoading(false)
    }).catch(() => {
      setError('Ma\'lumot yuklashda xato')
      setLoading(false)
    })
  }, [])

  // ── 2. Yandex Maps SDK yuklash ───────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).ymaps) {
      ymapsRef.current = (window as any).ymaps
      return
    }
    const script = document.createElement('script')
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=9e4db997-f532-41e0-8938-d905ec23cae7&lang=ru_RU'
    script.async = true
    script.onload = () => {
      ; (window as any).ymaps.ready(() => {
        ymapsRef.current = (window as any).ymaps
      })
    }
    document.head.appendChild(script)
  }, [])

  // ── 3. Filter funksiyasi ─────────────────────
  const filteredHouses = houses.filter(h => {
    // Location filter
    if (filters.location) {
      const q = filters.location.toLowerCase().trim()
      const aliases = DISTRICT_ALIASES[filters.location] || [filters.location.toLowerCase()]
      const haystack = (
        (h.title || '') + ' ' +
        (h.district || '') + ' ' +
        (h.landmark || '') + ' ' +
        (h.description || '')
      ).toLowerCase()

      const matched =
        haystack.includes(q) ||
        h.id.toString().includes(q) ||
        aliases.some(alias => haystack.includes(alias))

      if (!matched) return false
    }

    // Narx filter
    const numericPrice = h.price
    if (filters.priceMin && numericPrice < toNum(filters.priceMin)) return false
    if (filters.priceMax && numericPrice > toNum(filters.priceMax)) return false

    // Xonalar
    if ((h.rooms || 0) < parseInt(filters.roomMin || '0')) return false
    if (filters.roomMax && (h.rooms || 0) > parseInt(filters.roomMax)) return false

    // Maydon
    if ((h.area || 0) < parseInt(filters.areaMin || '0')) return false
    if (filters.areaMax && (h.area || 0) > parseInt(filters.areaMax)) return false

    // Qavat
    if (filters.floor && h.floor !== parseInt(filters.floor)) return false

    return true
  })

  // ── 4. Xarita va pinlarni render qilish ──────
  useEffect(() => {
    if (!mapRef.current || !ymapsRef.current || filteredHouses.length === 0) return

    const ymaps = ymapsRef.current

    ymaps.ready(() => {
      // Xarita yaratish (birinchi marta)
      if (!mapObjRef.current) {
        mapObjRef.current = new ymaps.Map(mapRef.current, {
          center: [41.2995, 69.2401], // Toshkent
          zoom: 12,
          controls: ['zoomControl', 'geolocationControl'],
        })
      }

      const map = mapObjRef.current

      // Eski pinlarni tozalash
      map.geoObjects.removeAll()

      // Har bir lid uchun pin qo'shish
      filteredHouses.forEach(house => {
        // Koordinata tekshirish
        if (
          !house.lat || !house.lng ||
          isNaN(house.lat) || isNaN(house.lng) ||
          house.lat < 37 || house.lat > 43 ||   // O'zbekiston lat diapazoni
          house.lng < 56 || house.lng > 74        // O'zbekiston lng diapazoni
        ) {
          console.warn(`⚠️ Noto'g'ri koordinata: lid ${house.id} — lat:${house.lat} lng:${house.lng}`)
          return
        }

        const placemark = new ymaps.Placemark(
          [house.lat, house.lng],
          {
            balloonContentHeader: house.title,
            balloonContentBody: `
              <div style="font-family: sans-serif; padding: 4px;">
                <b>${house.price.toLocaleString('ru')} so'm</b><br/>
                ${house.rooms} xona · ${house.area} m² · ${house.floor}-qavat<br/>
                ${house.district || ''}
              </div>
            `,
            hintContent: house.title,
          },
          {
            preset: 'islands#blueStretchyIcon',
            iconContent: Math.round(house.price / 1000) + 'K $',
          }







        )

        placemark.events.add('click', () => setSelected(house))
        map.geoObjects.add(placemark)
      })

      // Barcha pinlar ko'rinadigan qilib zoom moslashtirish
      if (filteredHouses.length > 0) {
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 })
      }
    })
  }, [filteredHouses])

  // ── 5. Render ────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-lg">
      Yuklanmoqda...
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen text-red-500">
      {error}
    </div>
  )

  return (
    <div className="flex flex-col h-screen">

      {/* FILTER PANELI */}
      <div className="flex flex-wrap gap-2 p-3 bg-white border-b shadow-sm">

        {/* Tuman / lokatsiya qidirish */}
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

        {/* Narx */}
        <input
          type="number" placeholder="Narx dan"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.priceMin}
          onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value }))}
        />
        <input
          type="number" placeholder="Narx gacha"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.priceMax}
          onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))}
        />

        {/* Xona */}
        <input
          type="number" placeholder="Xona dan"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.roomMin}
          onChange={e => setFilters(f => ({ ...f, roomMin: e.target.value }))}
        />
        <input
          type="number" placeholder="Xona gacha"
          className="border rounded px-2 py-1 text-sm w-24"
          value={filters.roomMax}
          onChange={e => setFilters(f => ({ ...f, roomMax: e.target.value }))}
        />

        {/* Maydon */}
        <input
          type="number" placeholder="Maydon dan m²"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.areaMin}
          onChange={e => setFilters(f => ({ ...f, areaMin: e.target.value }))}
        />
        <input
          type="number" placeholder="Maydon gacha m²"
          className="border rounded px-2 py-1 text-sm w-28"
          value={filters.areaMax}
          onChange={e => setFilters(f => ({ ...f, areaMax: e.target.value }))}
        />

        {/* Qavat */}
        <input
          type="number" placeholder="Qavat"
          className="border rounded px-2 py-1 text-sm w-20"
          value={filters.floor}
          onChange={e => setFilters(f => ({ ...f, floor: e.target.value }))}
        />

        {/* Reset */}
        <button
          className="border rounded px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200"
          onClick={() => setFilters({
            location: '', priceMin: '', priceMax: '',
            roomMin: '', roomMax: '', areaMin: '', areaMax: '', floor: ''
          })}
        >
          Tozalash
        </button>

        <span className="ml-auto text-sm text-gray-500 self-center">
          {filteredHouses.length} ta ob'ekt
        </span>
      </div>

      {/* XARITA */}
      <div className="flex flex-1 relative">
        <div ref={mapRef} className="flex-1" />

        {/* TANLANGAN LID — info panel */}
        {selected && (
          <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-4 w-72 z-10">
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-lg"
              onClick={() => setSelected(null)}
            >×</button>
            <h3 className="font-semibold text-base mb-1">{selected.title}</h3>
            <p className="text-lg font-bold text-blue-600 mb-2">
              {selected.price.toLocaleString('ru')} so'm
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <div>🏠 {selected.rooms} xona · {selected.area} m²</div>
              <div>🏢 {selected.floor}/{selected.totalFloors}-qavat</div>
              {selected.district && <div>📍 {selected.district}</div>}
              {selected.landmark && <div>🗺 {selected.landmark}</div>}
              {selected.description && (
                <div className="text-xs text-gray-500 mt-2 line-clamp-3">
                  {selected.description}
                </div>
              )}
            </div>
            {selected.yandex_url && (
              <a
                href={selected.yandex_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-sm bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600"
              >
                Yandex Xaritada ko'rish
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}