"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

export type House = {
  id: number; crmId: string; lat: number; lng: number; price: string
  oldPrice?: string; discount?: number; hot: boolean; title: string
  description: string; image: string; images?: string[]; rooms: number
  area: number; floor: number; totalFloors?: number; buildingType?: string; landmark?: string
}

const TUMANS = [
  "Chilonzor tumani", "Yunusobod tumani", "Mirzo Ulug'bek tumani",
  "Yakkasaroy tumani", "Shayxontohur tumani", "Mirobod tumani",
  "Sergeli tumani", "Uchtepa tumani", "Olmazor tumani",
  "Bektemir tumani", "Yangihayot tumani", "Yashnobod tumani", "Almazar tumani",
]

type Filters = {
  tuman: string; buildingType: string; roomsFrom: string; roomsTo: string
  floorFrom: string; floorTo: string; areaFrom: string; areaTo: string
  priceFrom: string; priceTo: string
}
const emptyFilters: Filters = {
  tuman: '', buildingType: '', roomsFrom: '', roomsTo: '',
  floorFrom: '', floorTo: '', areaFrom: '', areaTo: '', priceFrom: '', priceTo: ''
}

const TRANSLATIONS: any = {
  uz: {
    gallery: "Galereya", map: "Xarita", call: "Sotuvchi bilan bog'lanish",
    filter: "Filtrlar", room: "Xonalar", area: "Yuzasi", floor: "Qavat",
    bType: "Bino turi", landmark: "Orientir", desc: "Ta'rifi",
    search: "Qidirish...", latest: "Sotuvdagi e'lonlar",
    filterTitle: "Filtrlar", apartType: "Kvartira turi",
    newBuilding: "Yangi bino", secondary: "Ikkinchi qo'l",
    rooms: "Xonalar soni", floorLabel: "Qavat", area2: "Maydon, m²",
    price: "Narx ($)", apply: "Qo'llash", clear: "Tozalash",
    tuman: "Tuman", tumanPlaceholder: "Tumanni tanlang",
    noResults: "Hech nima topilmadi...", from: "Dan", to: "Gacha",
  },
  ru: {
    gallery: "Галерея", map: "Карта", call: "Связаться с продавцом",
    filter: "Фильтры", room: "Комнаты", area: "Площадь", floor: "Этаж",
    bType: "Тип здания", landmark: "Ориентир", desc: "Описание",
    search: "Поиск...", latest: "Объявления о продаже",
    filterTitle: "Фильтры", apartType: "Тип квартиры",
    newBuilding: "Новостройка", secondary: "Вторичка",
    rooms: "Количество комнат", floorLabel: "Этаж", area2: "Площадь, м²",
    price: "Цена ($)", apply: "Применить", clear: "Очистить",
    tuman: "Район", tumanPlaceholder: "Выберите район",
    noResults: "Ничего не найдено...", from: "От", to: "До",
  },
  en: {
    gallery: "Gallery", map: "Map", call: "Contact Seller",
    filter: "Filters", room: "Rooms", area: "Area", floor: "Floor",
    bType: "Building Type", landmark: "Landmark", desc: "Description",
    search: "Search...", latest: "Listings for sale",
    filterTitle: "Filters", apartType: "Apartment type",
    newBuilding: "New building", secondary: "Secondary",
    rooms: "Number of rooms", floorLabel: "Floor", area2: "Area, m²",
    price: "Price ($)", apply: "Apply", clear: "Clear",
    tuman: "District", tumanPlaceholder: "Select district",
    noResults: "Nothing found...", from: "From", to: "To",
  }
}

function buildYandexUrl(houses: House[], selected: House | null, center = { lat: 41.2995, lng: 69.2401 }, zoom = 13) {
  const ll = selected ? `${selected.lng},${selected.lat}` : `${center.lng},${center.lat}`
  const z = selected ? 15 : zoom
  const pts = houses.slice(0, 100).map(h => `${h.lng},${h.lat},pm2blm`).join('~')
  return `https://yandex.uz/map-widget/v1/?ll=${ll}&z=${z}${pts ? `&pt=${pts}` : ''}&lang=uz_UZ&scroll=true&controls=zoomControl`
}

export default function Map() {
  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  const [view, setView] = useState<"gallery" | "map">("gallery")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetail, setShowDetail] = useState(false)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters)
  const [lang, setLang] = useState<"uz" | "ru" | "en">("uz")
  const [lightbox, setLightbox] = useState<{ images: string[], index: number } | null>(null)
  const [mapZoom] = useState(13)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const t = TRANSLATIONS[lang]

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8&t=" + Date.now())
      .then(r => r.json()).then(setHouses)
  }, [])

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== '').length

  const filteredHouses = houses.filter(h => {
    const q = searchQuery.toLowerCase().trim()
    if (q && !h.title.toLowerCase().includes(q) && !(h.crmId && h.crmId.toString().includes(q)) && !(h.landmark && h.landmark.toLowerCase().includes(q))) return false
    if (appliedFilters.tuman && !(h.landmark && h.landmark.toLowerCase().includes(appliedFilters.tuman.toLowerCase()))) return false
    if (appliedFilters.buildingType && h.buildingType !== appliedFilters.buildingType) return false
    if (appliedFilters.roomsFrom && h.rooms < parseInt(appliedFilters.roomsFrom)) return false
    if (appliedFilters.roomsTo && h.rooms > parseInt(appliedFilters.roomsTo)) return false
    if (appliedFilters.floorFrom && h.floor < parseInt(appliedFilters.floorFrom)) return false
    if (appliedFilters.floorTo && h.floor > parseInt(appliedFilters.floorTo)) return false
    if (appliedFilters.areaFrom && h.area < parseFloat(appliedFilters.areaFrom)) return false
    if (appliedFilters.areaTo && h.area > parseFloat(appliedFilters.areaTo)) return false
    if (appliedFilters.priceFrom) { const p = parseInt(h.price.replace(/\D/g, '')) || 0; if (p < parseInt(appliedFilters.priceFrom)) return false }
    if (appliedFilters.priceTo) { const p = parseInt(h.price.replace(/\D/g, '')) || 0; if (p > parseInt(appliedFilters.priceTo)) return false }
    return true
  })

  const sortedHouses = [...filteredHouses].sort((a, b) => (parseInt(a.price.replace(/\D/g, "")) || 0) - (parseInt(b.price.replace(/\D/g, "")) || 0))
  const floorLabel = (h: House) => !h.floor ? '—' : h.totalFloors ? `${h.floor}/${h.totalFloors}` : `${h.floor}`

  const yandexMapUrl = buildYandexUrl(filteredHouses, selected)

  const inputStyle: React.CSSProperties = {
    background: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: 12,
    padding: '14px 16px', outline: 'none', fontWeight: 600, color: '#111',
    fontSize: 15, width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', background: '#f2f2f7' }}>

      {/* YANDEX MAP */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <iframe
          ref={iframeRef}
          src={yandexMapUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>

      {/* MAP CONTROLS */}
      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', top: 20, left: 0, right: 0, zIndex: 10, padding: '0 16px', display: 'flex', gap: 8, pointerEvents: 'none' }}>
            <button onClick={() => setView("gallery")} style={{ pointerEvents: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '10px 12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', flexShrink: 0, cursor: 'pointer' }}>
              <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '8px 12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', pointerEvents: 'auto' }}>
              <input type="text" placeholder={t.search} style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 13, fontWeight: 700, color: '#111' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAP VIEW — uylar list (bottom) */}
      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && filteredHouses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 0 12px' }}>
            <div style={{ display: 'flex', overflowX: 'auto', gap: 10, padding: '8px 16px', scrollSnapType: 'x mandatory' }} className="[&::-webkit-scrollbar]:hidden">
              {filteredHouses.map(h => (
                <div key={h.id} onClick={() => { setSelected(h) }} style={{ minWidth: 200, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', cursor: 'pointer', scrollSnapAlign: 'start', flexShrink: 0 }}>
                  <div style={{ position: 'relative', height: 100 }}>
                    <img src={h.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ fontWeight: 900, fontSize: 14, color: '#111', margin: '0 0 2px' }}>{h.price}</p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GALLERY */}
      <AnimatePresence>
        {view === "gallery" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto', background: '#f2f2f7' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderRadius: '0 0 24px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '16px 16px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 19, color: '#000' }}>MULK INVEST</span>
                <a href="https://instagram.com/mulk_invest" target="_blank" style={{ fontSize: 12, fontWeight: 700, color: '#333', background: '#f9fafb', padding: '6px 12px', borderRadius: 999, border: '1px solid #e5e7eb', textDecoration: 'none' }}>@mulk_invest</a>
                <select value={lang} onChange={e => setLang(e.target.value as any)} style={{ background: '#f3f4f6', color: '#111', fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 12, border: '1px solid #e5e7eb', outline: 'none' }}>
                  <option value="uz">UZB</option><option value="ru">РУС</option><option value="en">ENG</option>
                </select>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '10px 16px', border: '1px solid #e5e7eb', marginBottom: 10 }}>
                <input type="text" placeholder={t.search} style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 14, fontWeight: 700, color: '#111' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ flex: 1, background: '#FFD600', color: '#000', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e6c200', cursor: 'pointer' }}>{t.gallery}</button>
                <button onClick={() => setView("map")} style={{ flex: 1, background: '#f3f4f6', color: '#333', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e5e7eb', cursor: 'pointer' }}>{t.map}</button>
                <button onClick={() => { setFilters(appliedFilters); setIsFilterOpen(true) }} style={{ position: 'relative', flex: 0.8, background: '#f3f4f6', color: '#333', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                  {t.filter}
                  {activeFilterCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: '#FFD600', color: '#000', width: 18, height: 18, borderRadius: '50%', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
                </button>
              </div>
              <div style={{ marginTop: 8, borderBottom: '3px solid #FFD600', paddingBottom: 8, display: 'inline-block' }}>
                <span style={{ color: '#FFD600', fontWeight: 900, fontSize: 14 }}>{t.latest} ({sortedHouses.length})</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 16px 96px' }}>
              {sortedHouses.map(h => (
                <div key={h.id} onClick={() => { setSelected(h); setShowDetail(true) }} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', height: 120 }}>
                    <img src={h.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {h.hot && <span style={{ position: 'absolute', top: 6, right: 6, background: '#FFD600', color: '#000', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>TOP</span>}
                    {h.discount ? <span style={{ position: 'absolute', top: 6, left: 6, background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>-{h.discount}%</span> : null}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: 6, right: 6, color: '#fff', fontWeight: 700, fontSize: 10 }}>{h.area ? h.area + ' m²' : ''}</span>
                  </div>
                  <div style={{ padding: 10 }}>
                    <p style={{ fontWeight: 900, fontSize: 14, color: h.discount ? '#dc2626' : '#111', margin: '0 0 2px' }}>{h.price}</p>
                    {h.oldPrice && <p style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textDecoration: 'line-through', margin: '0 0 2px' }}>{h.oldPrice}</p>}
                    <p style={{ color: '#111', fontSize: 12, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.title}</p>
                    {h.landmark && <p style={{ color: '#6b7280', fontSize: 10, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.landmark}</p>}
                  </div>
                </div>
              ))}
              {sortedHouses.length === 0 && <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontWeight: 700 }}>{t.noResults}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET */}
      <AnimatePresence>
        {selected && !showDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} style={{ position: 'absolute', inset: 0, zIndex: 1010, background: 'rgba(0,0,0,0.3)' }} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 280 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2} onDragEnd={(_e: any, info: any) => { if (info.offset.y > 100) setSelected(null) }}
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 1020, background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', paddingBottom: 32, paddingTop: 12 }}>
              <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px' }}>
                <div style={{ width: 48, height: 6, background: '#e5e7eb', borderRadius: 999, margin: '0 auto 16px' }} />
                <div style={{ position: 'relative', width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 16, border: '1px solid #e5e7eb', display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', background: '#000' }} className="[&::-webkit-scrollbar]:hidden">
                  {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                    <div key={idx} onClick={() => setLightbox({ images: selected.images!, index: idx })} style={{ minWidth: '100%', height: '100%', position: 'relative', scrollSnapAlign: 'center', flexShrink: 0, cursor: 'zoom-in' }}>
                      <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{idx + 1} / {selected.images?.length}</div>
                    </div>
                  )) : <div onClick={() => setLightbox({ images: [selected.image], index: 0 })} style={{ minWidth: '100%', height: '100%', flexShrink: 0, cursor: 'zoom-in' }}><img src={selected.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                  {selected.crmId && <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, zIndex: 10 }}>ID: {selected.crmId}</div>}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#000', margin: '0 0 4px' }}>{selected.title}</h2>
                <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{selected.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: 12, borderRadius: 16, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#000' }}>{selected.price}</span>
                  <button onClick={() => setShowDetail(true)} style={{ background: '#FFD600', color: '#000', fontWeight: 900, padding: '14px 32px', borderRadius: 12, fontSize: 14, border: '1px solid #e6c200', cursor: 'pointer' }}>Batafsil</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAIL VIEW */}
      <AnimatePresence>
        {showDetail && selected && (
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
            style={{ position: 'absolute', inset: 0, zIndex: 3000, background: '#fff', overflowY: 'auto' }}>
            <div style={{ position: 'relative', width: '100%', background: '#000' }}>
              <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', maxHeight: '60vh' }} className="[&::-webkit-scrollbar]:hidden">
                {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                  <div key={idx} onClick={() => setLightbox({ images: selected.images!, index: idx })} style={{ minWidth: '100%', position: 'relative', scrollSnapAlign: 'center', flexShrink: 0, maxHeight: '60vh', cursor: 'zoom-in' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '60vh' }} />
                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>{idx + 1} / {selected.images?.length}</div>
                  </div>
                )) : <div onClick={() => setLightbox({ images: [selected.image], index: 0 })} style={{ minWidth: '100%', flexShrink: 0, maxHeight: '60vh', cursor: 'zoom-in' }}><img src={selected.image} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '60vh' }} /></div>}
              </div>
              <button onClick={() => { setShowDetail(false); if (view === "gallery") setSelected(null) }} style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, width: 40, height: 40, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', pointerEvents: 'none' }}>
                {selected.crmId && <span style={{ background: '#FFD600', color: '#000', fontWeight: 900, padding: '4px 10px', borderRadius: 6, fontSize: 11, textTransform: 'uppercase', display: 'inline-block', marginBottom: 10 }}>ID: {selected.crmId}</span>}
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>{selected.title}</h1>
              </div>
            </div>
            <div style={{ padding: '20px 20px 112px', background: '#fff' }}>
              {/* Narx */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
                <p style={{ fontSize: 13, color: '#888', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Narx</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#000', margin: 0 }}>{selected.price}</p>
                  {selected.discount && selected.oldPrice && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 14, background: '#fef2f2', padding: '2px 8px', borderRadius: 6 }}>-{selected.discount}%</span>
                      <span style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'line-through', marginTop: 2 }}>{selected.oldPrice}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Asosiy parametrlar — katta kartochkalar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #f0f0f0' }}>
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.3 }}>Xonalar</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#111', lineHeight: 1 }}>{selected.rooms || '—'}</span>
                  <span style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>xona</span>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #f0f0f0' }}>
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.3 }}>Maydon</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1 }}>{selected.area || '—'}</span>
                  <span style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>m²</span>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #f0f0f0' }}>
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.3 }}>Qavat</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1 }}>{selected.floor || '—'} / {selected.totalFloors || '—'}</span>
                  <span style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>etaj / jami</span>
                </div>
              </div>

              {/* Qo'shimcha ma'lumotlar — ro'yxat */}
              <div style={{ background: '#f9fafb', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 20 }}>
                {selected.buildingType && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>Bino turi</p>
                      <p style={{ fontSize: 16, color: '#111', margin: 0, fontWeight: 800 }}>{selected.buildingType}</p>
                    </div>
                  </div>
                )}
                {selected.landmark && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="#e63946" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>Orientir (mo'ljal)</p>
                      <p style={{ fontSize: 16, color: '#111', margin: 0, fontWeight: 800 }}>{selected.landmark}</p>
                    </div>
                  </div>
                )}
                {selected.crmId && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>E'lon raqami</p>
                      <p style={{ fontSize: 16, color: '#111', margin: 0, fontWeight: 800 }}>#{selected.crmId}</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Xarita */}
              {selected.lat && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: '#888', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Manzil (xaritada)</p>
                  <a
                    href={`https://yandex.uz/maps/?ll=${selected.lng}%2C${selected.lat}&z=16&pt=${selected.lng}%2C${selected.lat}`}
                    target="_blank"
                    style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #e5e7eb', textDecoration: 'none', position: 'relative' }}
                  >
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(255,255,255,0.97)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxWidth: 'calc(100% - 20px)' }}>
                      <svg width="12" height="12" fill="#e63946" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{selected.landmark || selected.title}</span>
                    </div>
                    <img
                      src={`https://static-maps.yandex.ru/v1?ll=${selected.lng},${selected.lat}&z=16&size=600,220&l=map&pt=${selected.lng},${selected.lat},pm2rdm&lang=uz_UZ`}
                      style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                      onError={(e) => { const el = e.currentTarget; el.style.display = 'none'; const next = el.nextElementSibling as HTMLElement; if (next) next.style.display = 'flex' }}
                    />
                    <div style={{ display: 'none', height: 220, background: '#f3f4f6', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                      <svg width="32" height="32" fill="none" stroke="#bbb" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span style={{ fontSize: 13, color: '#bbb', fontWeight: 600 }}>Xarita yuklanmadi</span>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #f0f0f0' }}>
                      <svg width="14" height="14" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Yandex Maps da to'liq ochish</span>
                      <svg width="12" height="12" fill="none" stroke="#aaa" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                  </a>
                </div>
              )}

              {/* Tavsif */}
              {selected.description && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: '#888', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ta'rif</p>
                  <p style={{ color: '#333', lineHeight: 1.8, fontSize: 16, margin: 0 }}>{selected.description}</p>
                </div>
              )}
            </div>
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', borderTop: '1px solid #f0f0f0', padding: 20, zIndex: 20, boxSizing: 'border-box' }}>
              <button onClick={() => { window.location.href = "tel:+998909059990" }} style={{ width: '100%', background: '#FFD600', color: '#000', fontWeight: 900, padding: '16px 0', borderRadius: 16, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                📞 {t.call}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', inset: 0, zIndex: 9000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >
              <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700, opacity: 0.8 }}>
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', height: '100%', display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' }}
              className="[&::-webkit-scrollbar]:hidden"
              ref={el => {
                if (el) {
                  el.scrollLeft = lightbox.index * el.offsetWidth
                  el.onscroll = () => {
                    const idx = Math.round(el.scrollLeft / el.offsetWidth)
                    if (idx !== lightbox.index) setLightbox(lb => lb ? { ...lb, index: idx } : null)
                  }
                }
              }}
            >
              {lightbox.images.map((img, idx) => (
                <div key={idx} style={{ minWidth: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', flexShrink: 0 }}>
                  <img
                    src={img}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            {lightbox.images.length > 1 && lightbox.index > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(lb => lb ? { ...lb, index: lb.index - 1 } : null) }}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', zIndex: 10 }}
              >
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            {lightbox.images.length > 1 && lightbox.index < lightbox.images.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(lb => lb ? { ...lb, index: lb.index + 1 } : null) }}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', zIndex: 10 }}
              >
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER — yangi dizayn */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            style={{ position: 'absolute', inset: 0, zIndex: 4000, background: '#fff', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: '#000', margin: 0 }}>{t.filterTitle}</h2>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width="28" height="28" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>

              {/* Kvartira turi */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.apartType}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'Novostroyka', label: t.newBuilding },
                    { value: 'Vtorichka', label: t.secondary },
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setFilters(f => ({ ...f, buildingType: f.buildingType === type.value ? '' : type.value }))}
                      style={{
                        flex: 1, padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        border: filters.buildingType === type.value ? '2px solid #000' : '1.5px solid #e5e7eb',
                        background: filters.buildingType === type.value ? '#f9fafb' : '#f3f4f6',
                        color: '#111',
                        transition: 'all 0.15s',
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tuman */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.tuman}</p>
                <div style={{ position: 'relative' }}>
                  <select
                    value={filters.tuman}
                    onChange={e => setFilters(f => ({ ...f, tuman: e.target.value }))}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: 44,
                    }}
                  >
                    <option value="">{t.tumanPlaceholder}</option>
                    {TUMANS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                  </select>
                </div>
              </div>

              {/* Xonalar soni */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.rooms}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    value={filters.roomsFrom}
                    onChange={e => setFilters(f => ({ ...f, roomsFrom: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={filters.roomsTo}
                    onChange={e => setFilters(f => ({ ...f, roomsTo: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              {/* Qavat */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.floorLabel}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    value={filters.floorFrom}
                    onChange={e => setFilters(f => ({ ...f, floorFrom: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={filters.floorTo}
                    onChange={e => setFilters(f => ({ ...f, floorTo: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              {/* Maydon */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.area2}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    value={filters.areaFrom}
                    onChange={e => setFilters(f => ({ ...f, areaFrom: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={filters.areaTo}
                    onChange={e => setFilters(f => ({ ...f, areaTo: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              {/* Narx */}
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: '0 0 10px' }}>{t.price}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    value={filters.priceFrom}
                    onChange={e => setFilters(f => ({ ...f, priceFrom: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={filters.priceTo}
                    onChange={e => setFilters(f => ({ ...f, priceTo: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12, flexShrink: 0, background: '#fff' }}>
              <button
                onClick={() => { setFilters(emptyFilters); setAppliedFilters(emptyFilters) }}
                style={{ flex: 0.45, background: '#f3f4f6', color: '#555', fontWeight: 700, padding: '16px 0', borderRadius: 16, fontSize: 15, border: '1.5px solid #e5e7eb', cursor: 'pointer' }}
              >
                {t.clear}
              </button>
              <button
                onClick={() => { setAppliedFilters(filters); setIsFilterOpen(false) }}
                style={{ flex: 1, background: '#FFD600', color: '#000', fontWeight: 900, padding: '16px 0', borderRadius: 16, fontSize: 16, border: 'none', cursor: 'pointer' }}
              >
                {t.apply}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
