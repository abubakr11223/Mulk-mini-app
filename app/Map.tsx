"use client"

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet"
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
  html: `<div class="relative flex items-center justify-center px-3 py-1 rounded-[6px] font-extrabold text-[13px] tracking-tight shadow-md bg-[#FFD600] text-black border border-yellow-500/50 whitespace-nowrap">${price.replace(" ", "")}<div class="absolute -bottom-[5px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFD600]"></div></div>`,
  className: "",
})

const createClusterIcon = (cluster: any) => L.divIcon({
  html: `<div class="bg-[#FFD600] text-black w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[14px] shadow-md border-[2px] border-white">${cluster.getChildCount()}</div>`,
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
  const [lang, setLang] = useState<"uz" | "ru" | "en">("uz")
  const t = T[lang]
  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  const [view, setView] = useState<"gallery" | "map">("gallery")
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

  const sortedHouses = [...filteredHouses].sort((a, b) => (parseInt(a.price.replace(/\D/g, "")) || 0) - (parseInt(b.price.replace(/\D/g, "")) || 0))

  // Qavat formati: "3/7"
  const floorLabel = (h: House) => {
    if (!h.floor) return '—'
    return h.totalFloors ? `${h.floor}/${h.totalFloors}` : `${h.floor}`
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f2f2f7]">
      <div className="absolute inset-0 z-0">
        <MapContainer center={[41.2995, 69.2401]} zoom={13} zoomControl={false} minZoom={11} maxZoom={18} maxBounds={[[41.0, 68.8], [41.6, 69.6]]} maxBoundsViscosity={1.0} className="h-full w-full">
          {/* ✅ Yandex Maps tile */}
          <TileLayer
            url="https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU"
            attribution='&copy; <a href="https://yandex.ru/maps">Яндекс Карты</a>'
          />
          <MapController selected={selected} filteredHouses={filteredHouses} isSearching={searchQuery.trim().length > 0} />
          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {filteredHouses.map(h => (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={createPriceIcon(h.price)} eventHandlers={{ click: () => setSelected(h) }} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-5 left-0 right-0 z-[10] px-4 flex gap-2 pointer-events-none items-center">
            <button onClick={() => setView("gallery")} className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-[14px] px-3 py-3 shadow-md border border-gray-100 flex-shrink-0 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 bg-white/95 backdrop-blur-md rounded-[14px] flex items-center px-3 py-2.5 border border-gray-100 shadow-md pointer-events-auto">
              <input type="text" placeholder={t.search} className="bg-transparent border-none outline-none w-full text-[13px] font-bold text-gray-900 placeholder-gray-400" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === "gallery" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[20] overflow-y-auto bg-[#f2f2f7]">
            <div className="sticky top-0 z-[30] bg-white rounded-b-[24px] shadow-sm flex flex-col px-4 pt-4 pb-2 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-[19px] tracking-tight text-black">MULK INVEST</span>
                <a href="https://instagram.com/mulk_invest" target="_blank" className="text-[12px] font-bold text-gray-800 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-200">@mulk_invest</a>
                <select value={lang} onChange={e => setLang(e.target.value as any)} className="bg-gray-100 text-[12px] font-black px-3 py-2 rounded-xl outline-none border border-gray-200">
                  <option value="uz">UZB</option><option value="ru">РУС</option><option value="en">ENG</option>
                </select>
              </div>
              <div className="bg-gray-100/80 rounded-[14px] flex items-center px-4 py-3 border border-gray-200">
                <input type="text" placeholder={t.search} className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-gray-900 placeholder-gray-400" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-1.5 w-full">
                <button className="flex-1 bg-[#FFD600] text-black font-extrabold py-3 rounded-[14px] text-[13px]">{t.gallery}</button>
                <button onClick={() => setView("map")} className="flex-1 bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] border border-gray-200">{t.map}</button>
                <button onClick={() => setIsFilterOpen(true)} className="flex-[0.8] bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] border border-gray-200">{t.filter}</button>
              </div>
              <span className="text-[#FFD600] font-black text-[14px] border-b-[3px] border-[#FFD600] pb-2 px-1">{t.latest}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 pb-24">
              {sortedHouses.map(h => (
                <div key={h.id} onClick={() => { setSelected(h); setShowDetail(true) }} className="bg-white rounded-[16px] overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform">
                  <div className="relative h-[120px] w-full">
                    <img src={h.image} className="w-full h-full object-cover" />
                    {h.hot && <span className="absolute top-2 right-2 bg-[#FFD600] text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">TOP</span>}
                    {h.discount ? <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">-{h.discount}%</span> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className="absolute bottom-2 right-2 text-white font-bold text-[10px]">{h.area} m²</span>
                  </div>
                  <div className="p-3">
                    <p className={`font-black text-[14px] ${h.discount ? "text-red-600" : "text-gray-900"}`}>{h.price}</p>
                    {h.oldPrice && <p className="text-gray-400 text-[10px] line-through">{h.oldPrice}</p>}
                    <p className="text-gray-900 text-[12px] font-bold line-clamp-1">{h.title}</p>
                    {h.landmark && <p className="text-gray-500 text-[10px] line-clamp-1">{h.landmark}</p>}
                  </div>
                </div>
              ))}
              {sortedHouses.length === 0 && <div className="col-span-2 text-center text-gray-400 py-10 font-bold">Hech nima topilmadi...</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && !showDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="absolute inset-0 z-[1010] bg-black/30" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 280 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2} onDragEnd={(_e, info) => { if (info.offset.y > 100) setSelected(null) }} className="absolute bottom-0 left-0 w-full z-[1020] bg-white rounded-t-[24px] shadow-xl pb-8 pt-3 px-4">
              <div className="max-w-md mx-auto">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="relative w-full h-[220px] rounded-[16px] overflow-hidden mb-4 border border-gray-200 flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden bg-black">
                  {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                    <div key={idx} className="min-w-full h-full relative snap-center shrink-0">
                      <img src={img} alt={selected.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md z-20">{idx + 1} / {selected.images?.length}</div>
                    </div>
                  )) : (
                    <div className="min-w-full h-full relative shrink-0">
                      <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {selected.crmId && <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md z-10">ID: {selected.crmId}</div>}
                </div>
                <h2 className="text-[18px] font-black text-black mb-1">{selected.title}</h2>
                <p className="text-gray-500 text-[14px] line-clamp-1 mb-4">{selected.description}</p>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-[16px] border border-gray-200">
                  <span className="text-2xl font-black text-black">{selected.price}</span>
                  <button onClick={() => setShowDetail(true)} className="bg-[#FFD600] text-black font-extrabold py-3.5 px-8 rounded-[12px] active:scale-95 text-[14px]">Batafsil</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetail && selected && (
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 220 }} className="absolute inset-0 z-[3000] bg-white overflow-y-auto">
            <div className="relative w-full bg-black">
              <div className="flex overflow-x-auto snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "60vh" }}>
                {selected.images && selected.images.length > 0 ? selected.images.map((img, idx) => (
                  <div key={idx} className="min-w-full relative snap-center shrink-0" style={{ maxHeight: "60vh" }}>
                    <img src={img} className="w-full h-full object-cover" style={{ maxHeight: "60vh" }} />
                    <div className="absolute top-4 right-4 bg-black/60 text-white text-[12px] font-bold px-3 py-1.5 rounded-full z-20">{idx + 1} / {selected.images?.length}</div>
                  </div>
                )) : (
                  <div className="min-w-full relative shrink-0" style={{ maxHeight: "60vh" }}>
                    <img src={selected.image} className="w-full h-full object-cover" style={{ maxHeight: "60vh" }} />
                  </div>
                )}
              </div>
              <button onClick={() => { setShowDetail(false); if (view === "gallery") setSelected(null) }} className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 backdrop-blur-md flex justify-center items-center rounded-full text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                {selected.crmId && <span className="bg-[#FFD600] text-black font-extrabold px-2.5 py-1 rounded-md text-[11px] uppercase mb-2 inline-block">ID: {selected.crmId}</span>}
                <h1 className="text-[26px] font-black text-white leading-tight">{selected.title}</h1>
              </div>
            </div>
            <div className="p-5 pb-28">
              <div className="flex items-center gap-3 mb-6">
                <p className="text-3xl font-black text-black">{selected.price}</p>
                {selected.discount && selected.oldPrice && (
                  <div className="flex flex-col">
                    <span className="text-red-500 font-black text-[13px]">-{selected.discount}%</span>
                    <span className="text-gray-400 text-[12px] line-through">{selected.oldPrice}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-around items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
                <div className="flex flex-col items-center">
                  <span className="font-black text-[16px]">{selected.rooms || "—"}</span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase">{t.room}</span>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="flex flex-col items-center">
                  <span className="font-black text-[16px]">{selected.area ? selected.area + " m²" : "—"}</span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase">{t.area}</span>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                {/* ✅ Qavat formati: 3/7 */}
                <div className="flex flex-col items-center">
                  <span className="font-black text-[16px]">{floorLabel(selected)}</span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase">{t.floor}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mb-8">
                {selected.buildingType && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 font-bold text-[14px]">{t.bType}</span>
                    <span className="text-black font-black text-[15px]">{selected.buildingType}</span>
                  </div>
                )}
                {selected.landmark && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 font-bold text-[14px]">{t.landmark}</span>
                    <span className="text-black font-black text-[15px] text-right max-w-[60%]">{selected.landmark}</span>
                  </div>
                )}
              </div>

              {selected.description && (
                <>
                  <h3 className="font-black text-gray-900 mb-3 text-[18px]">{t.desc}</h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{selected.description}</p>
                </>
              )}
            </div>
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-5 z-20">
              <button onClick={() => { window.location.href = "tel:+998909059990" }} className="w-full bg-[#FFD600] text-black font-extrabold py-4 rounded-xl text-[16px] active:scale-95">{t.call}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }} className="absolute inset-0 z-[4000] bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-2xl font-black text-black">{t.filter}</h2>
              <button onClick={() => setIsFilterOpen(false)} className="bg-gray-100 p-2.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-5 pb-32">
              <div><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Tuman / Ko'cha</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="Yozing..." /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Narx (dan)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="0 $" /></div>
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Narx (gacha)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="Max" /></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Xonalar (dan)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="1" /></div>
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Xonalar (gacha)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="5" /></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Maydon m² (dan)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="30" /></div>
                <div className="flex-1"><label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Maydon m² (gacha)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none font-bold" placeholder="200" /></div>
              </div>
            </div>
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-5">
              <button onClick={() => setIsFilterOpen(false)} className="w-full bg-[#FFD600] text-black font-extrabold py-4 rounded-xl text-[16px]">Natijalarni ko'rsatish</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
