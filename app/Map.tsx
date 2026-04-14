"use client"

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"
import { useEffect, useState } from "react"
import L from "leaflet"
import { motion, AnimatePresence } from "framer-motion"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

const createPriceIcon = (price: string) => L.divIcon({
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:6px;font-weight:900;font-size:13px;background:#FFD600;color:#000;border:1px solid rgba(0,0,0,0.15);white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${price.replace(" ", "")}<div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #FFD600"></div></div>`,
  className: "",
})

const createClusterIcon = (cluster: any) => L.divIcon({
  html: `<div style="background:#FFD600;color:#000;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid #fff">${cluster.getChildCount()}</div>`,
  className: "",
})

export type House = {
  id: number; crmId: string; lat: number; lng: number; price: string
  oldPrice?: string; discount?: number; hot: boolean; title: string
  description: string; image: string; images?: string[]; rooms: number
  area: number; floor: number; totalFloors?: number; buildingType?: string; landmark?: string
}

function MapController({ selected, filteredHouses, isSearching }: { selected: House | null, filteredHouses: House[], isSearching: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (selected) { map.flyTo([selected.lat - 0.007, selected.lng], 15, { duration: 0.8 }) }
    else if (isSearching && filteredHouses.length > 0) {
      if (filteredHouses.length === 1) { map.flyTo([filteredHouses[0].lat, filteredHouses[0].lng], 15, { duration: 0.6 }) }
      else { map.flyToBounds(L.latLngBounds(filteredHouses.map(h => [h.lat, h.lng])), { padding: [50, 50], duration: 0.6, maxZoom: 14 }) }
    }
  }, [selected, filteredHouses, isSearching, map])
  return null
}

const T: any = {
  uz: { gallery: "Galereya", map: "Xarita", call: "Sotuvchi bilan bog'lanish", filter: "Filtrlar", room: "Xonalar", area: "Yuzasi", floor: "Qavat", bType: "Bino turi", landmark: "Orientir", desc: "Ta'rifi", search: "Qidirish...", latest: "Sotuvdagi e'lonlar" },
  ru: { gallery: "Галерея", map: "Карта", call: "Связаться с продавцом", filter: "Фильтры", room: "Комнаты", area: "Площадь", floor: "Этаж", bType: "Тип здания", landmark: "Ориентир", desc: "Описание", search: "Поиск...", latest: "Объявления о продаже" },
  en: { gallery: "Gallery", map: "Map", call: "Contact Seller", filter: "Filters", room: "Rooms", area: "Area", floor: "Floor", bType: "Building Type", landmark: "Landmark", desc: "Description", search: "Search...", latest: "Listings for sale" }
}

export default function Map() {
  const [lang, setLang] = useState<"uz"|"ru"|"en">("uz")
  const t = T[lang]
  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  const [view, setView] = useState<"gallery"|"map">("gallery")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8&t=" + Date.now())
      .then(r => r.json()).then(setHouses)
  }, [])

  const filteredHouses = houses.filter(h => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return h.title.toLowerCase().includes(q) || (h.crmId && h.crmId.toString().includes(q)) || (h.landmark && h.landmark.toLowerCase().includes(q))
  })

  const sortedHouses = [...filteredHouses].sort((a, b) => (parseInt(a.price.replace(/\D/g,""))||0) - (parseInt(b.price.replace(/\D/g,""))||0))

  const floorLabel = (h: House) => {
    if (!h.floor) return '—'
    return h.totalFloors ? `${h.floor}/${h.totalFloors}` : `${h.floor}`
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', background: '#f2f2f7' }}>

      {/* MAP */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapContainer center={[41.2995, 69.2401]} zoom={13} zoomControl={false} minZoom={11} maxZoom={18} maxBounds={[[41.0,68.8],[41.6,69.6]]} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU"
            attribution='&copy; Яндекс Карты'
          />
          <MapController selected={selected} filteredHouses={filteredHouses} isSearching={searchQuery.trim().length > 0} />
          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {filteredHouses.map(h => (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={createPriceIcon(h.price)} eventHandlers={{ click: () => setSelected(h) }} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* MAP CONTROLS */}
      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', top: 20, left: 0, right: 0, zIndex: 10, padding: '0 16px', display: 'flex', gap: 8, pointerEvents: 'none' }}>
            <button onClick={() => setView("gallery")}
              style={{ pointerEvents: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '10px 12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '8px 12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', pointerEvents: 'auto' }}>
              <input type="text" placeholder={t.search}
                style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 13, fontWeight: 700, color: '#111' }}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GALLERY */}
      <AnimatePresence>
        {view === "gallery" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto', background: '#f2f2f7' }}>

            {/* Header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderRadius: '0 0 24px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '16px 16px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 19, color: '#000', letterSpacing: '-0.5px' }}>MULK INVEST</span>
                <a href="https://instagram.com/mulk_invest" target="_blank"
                  style={{ fontSize: 12, fontWeight: 700, color: '#333', background: '#f9fafb', padding: '6px 12px', borderRadius: 999, border: '1px solid #e5e7eb', textDecoration: 'none' }}>
                  @mulk_invest
                </a>
                <select value={lang} onChange={e => setLang(e.target.value as any)}
                  style={{ background: '#f3f4f6', color: '#111', fontSize: 12, fontWeight: 900, padding: '7px 12px', borderRadius: 12, border: '1px solid #e5e7eb', outline: 'none', cursor: 'pointer' }}>
                  <option value="uz">UZB</option>
                  <option value="ru">РУС</option>
                  <option value="en">ENG</option>
                </select>
              </div>

              <div style={{ background: '#f3f4f6', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '10px 16px', border: '1px solid #e5e7eb', marginBottom: 10 }}>
                <input type="text" placeholder={t.search}
                  style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 14, fontWeight: 700, color: '#111' }}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ flex: 1, background: '#FFD600', color: '#000', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e6c200', cursor: 'pointer' }}>{t.gallery}</button>
                <button onClick={() => setView("map")} style={{ flex: 1, background: '#f3f4f6', color: '#333', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e5e7eb', cursor: 'pointer' }}>{t.map}</button>
                <button onClick={() => setIsFilterOpen(true)} style={{ flex: 0.8, background: '#f3f4f6', color: '#333', fontWeight: 900, padding: '12px 0', borderRadius: 14, fontSize: 13, border: '1px solid #e5e7eb', cursor: 'pointer' }}>{t.filter}</button>
              </div>
              <div style={{ marginTop: 8, borderBottom: '3px solid #FFD600', paddingBottom: 8, display: 'inline-block' }}>
                <span style={{ color: '#FFD600', fontWeight: 900, fontSize: 14 }}>{t.latest}</span>
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 16px 96px' }}>
              {sortedHouses.map(h => (
                <div key={h.id} onClick={() => { setSelected(h); setShowDetail(true) }}
                  style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', height: 120, width: '100%' }}>
                    <img src={h.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {h.hot && <span style={{ position: 'absolute', top: 6, right: 6, background: '#FFD600', color: '#000', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>TOP</span>}
                    {h.discount ? <span style={{ position: 'absolute', top: 6, left: 6, background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>-{h.discount}%</span> : null}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}/>
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
              {sortedHouses.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontWeight: 700 }}>Hech nima topilmadi...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET */}
      <AnimatePresence>
        {selected && !showDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', inset: 0, zIndex: 1010, background: 'rgba(0,0,0,0.3)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
              onDragEnd={(_e: any, info: any) => { if (info.offset.y > 100) setSelected(null) }}
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 1020, background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', paddingBottom: 32, paddingTop: 12 }}>
              <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px' }}>
                <div style={{ width: 48, height: 6, background: '#e5e7eb', borderRadius: 999, margin: '0 auto 16px' }} />
                <div style={{ position: 'relative', width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 16, border: '1px solid #e5e7eb', display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', background: '#000' }}
                  className="[&::-webkit-scrollbar]:hidden">
                  {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                    <div key={idx} style={{ minWidth: '100%', height: '100%', position: 'relative', scrollSnapAlign: 'center', flexShrink: 0 }}>
                      <img src={img} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, zIndex: 20 }}>{idx+1} / {selected.images?.length}</div>
                    </div>
                  )) : (
                    <div style={{ minWidth: '100%', height: '100%', flexShrink: 0 }}>
                      <img src={selected.image} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
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
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            style={{ position: 'absolute', inset: 0, zIndex: 3000, background: '#fff', overflowY: 'auto' }}>

            {/* Rasmlar */}
            <div style={{ position: 'relative', width: '100%', background: '#000' }}>
              <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', maxHeight: '60vh' }}
                className="[&::-webkit-scrollbar]:hidden">
                {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                  <div key={idx} style={{ minWidth: '100%', position: 'relative', scrollSnapAlign: 'center', flexShrink: 0, maxHeight: '60vh' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '60vh' }} />
                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, zIndex: 20 }}>{idx+1} / {selected.images?.length}</div>
                  </div>
                )) : (
                  <div style={{ minWidth: '100%', flexShrink: 0, maxHeight: '60vh' }}>
                    <img src={selected.image} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '60vh' }} />
                  </div>
                )}
              </div>
              <button onClick={() => { setShowDetail(false); if (view === "gallery") setSelected(null) }}
                style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, width: 40, height: 40, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', pointerEvents: 'none' }}>
                {selected.crmId && <span style={{ background: '#FFD600', color: '#000', fontWeight: 900, padding: '4px 10px', borderRadius: 6, fontSize: 11, textTransform: 'uppercase', display: 'inline-block', marginBottom: 10 }}>ID: {selected.crmId}</span>}
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>{selected.title}</h1>
              </div>
            </div>

            {/* Kontent */}
            <div style={{ padding: '20px 20px 112px', background: '#fff' }}>
              {/* Narx */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#000', margin: 0 }}>{selected.price}</p>
                {selected.discount && selected.oldPrice && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 13 }}>-{selected.discount}%</span>
                    <span style={{ color: '#9ca3af', fontSize: 12, textDecoration: 'line-through' }}>{selected.oldPrice}</span>
                  </div>
                )}
              </div>

              {/* Statistika — OQLIK FONDA, ANIQ YOZUV */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff', padding: 16, borderRadius: 16, border: '2px solid #f0f0f0', marginBottom: 32, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#111111' }}>{selected.rooms || "—"}</span>
                  <span style={{ color: '#555555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{t.room}</span>
                </div>
                <div style={{ width: 1, height: 40, background: '#e5e7eb' }}/>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#111111' }}>{selected.area ? selected.area + " m²" : "—"}</span>
                  <span style={{ color: '#555555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{t.area}</span>
                </div>
                <div style={{ width: 1, height: 40, background: '#e5e7eb' }}/>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#111111' }}>{floorLabel(selected)}</span>
                  <span style={{ color: '#555555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{t.floor}</span>
                </div>
              </div>

              {/* Qo'shimcha ma'lumotlar */}
              <div style={{ marginBottom: 32 }}>
                {selected.buildingType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#555555', fontWeight: 700, fontSize: 14 }}>{t.bType}</span>
                    <span style={{ color: '#111111', fontWeight: 900, fontSize: 15 }}>{selected.buildingType}</span>
                  </div>
                )}
                {selected.landmark && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#555555', fontWeight: 700, fontSize: 14 }}>{t.landmark}</span>
                    <span style={{ color: '#111111', fontWeight: 900, fontSize: 15, textAlign: 'right', maxWidth: '60%' }}>{selected.landmark}</span>
                  </div>
                )}
              </div>

              {selected.description && (
                <>
                  <h3 style={{ fontWeight: 900, color: '#111111', marginBottom: 12, fontSize: 18 }}>{t.desc}</h3>
                  <p style={{ color: '#444444', lineHeight: 1.7, fontSize: 15 }}>{selected.description}</p>
                </>
              )}
            </div>

            {/* Tugma */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', borderTop: '1px solid #f0f0f0', padding: 20, zIndex: 20, boxSizing: 'border-box' }}>
              <button onClick={() => { window.location.href = "tel:+998909059990" }}
                style={{ width: '100%', background: '#FFD600', color: '#000', fontWeight: 900, padding: '16px 0', borderRadius: 16, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                {t.call}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            style={{ position: 'absolute', inset: 0, zIndex: 4000, background: '#fff', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: 0 }}>{t.filter}</h2>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="#333" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 128 }}>
              {[
                { label: 'Tuman / Ko\'cha', type: 'text', placeholder: 'Yozing...' },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Narx (dan)</label>
                  <input type="number" placeholder="0 $" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Narx (gacha)</label>
                  <input type="number" placeholder="Max" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Xonalar (dan)</label>
                  <input type="number" placeholder="1" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Xonalar (gacha)</label>
                  <input type="number" placeholder="5" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Maydon m² (dan)</label>
                  <input type="number" placeholder="30" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Maydon m² (gacha)</label>
                  <input type="number" placeholder="200" style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', outline: 'none', fontWeight: 700, color: '#111', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', borderTop: '1px solid #f0f0f0', padding: 20, boxSizing: 'border-box' }}>
              <button onClick={() => setIsFilterOpen(false)} style={{ width: '100%', background: '#FFD600', color: '#000', fontWeight: 900, padding: '16px 0', borderRadius: 16, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                Natijalarni ko'rsatish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
