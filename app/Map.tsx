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

// ICON FIX
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

const createPriceIcon = (price: string) =>
  L.divIcon({
    html: `
      <div class="relative flex items-center justify-center px-3 py-1 rounded-[6px] font-extrabold text-[13px] tracking-tight shadow-md transition-transform duration-200 hover:scale-110 bg-[#FFD600] text-black border border-yellow-500/50 whitespace-nowrap">
        ${price.replace(" ", "")}
        <div class="absolute -bottom-[5px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFD600]"></div>
      </div>
    `,
    className: "",
  })

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `
      <div class="bg-[#FFD600] text-black w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[14px] shadow-md border-[2px] border-white">
        ${count}
      </div>
    `,
    className: "",
  })
}

type House = {
  id: number
  crmId: string
  lat: number
  lng: number
  price: string
  hot: boolean
  title: string
  description: string
  image: string
  rooms: number
  area: number
  floor: number
  totalFloors?: number
  buildingType?: string
  landmark?: string
}

function MapController({ selected, filteredHouses, isSearching }: { selected: House | null, filteredHouses: House[], isSearching: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat - 0.007, selected.lng], 15, {
        duration: 0.8,
        easeLinearity: 0.25,
      })
    } else if (isSearching && filteredHouses.length > 0) {
      const bounds = L.latLngBounds(filteredHouses.map(h => [h.lat, h.lng]))
      if (filteredHouses.length === 1) {
        map.flyTo([filteredHouses[0].lat, filteredHouses[0].lng], 15, { duration: 0.6 })
      } else {
        map.flyToBounds(bounds, { padding: [50, 50], duration: 0.6, maxZoom: 14 })
      }
    }
  }, [selected, filteredHouses, isSearching, map])

  return null
}

const TRANSLATIONS = {
  uz: {
    gallery: "Galereya",
    map: "Xarita",
    call: "Sotuvchi bilan bog'lanish",
    back: "Orqaga",
    filter: "Filtrlar",
    room: "Xonalar",
    area: "Yuzasi",
    floor: "Qavat",
    bType: "Bino turi",
    landmark: "Mo'ljal (Orientir)",
    desc: "Ta'rifi",
    search: "Qidirish...",
    latest: "Sotuvdagi e'lonlar",
    NotFound: "Hech narsa topilmadi",
    mainSpec: "Asosiy xususiyatlar",
  },
  ru: {
    gallery: "Галерея",
    map: "Карта",
    call: "Связаться с продавцом",
    back: "Назад",
    filter: "Фильтры",
    room: "Комнаты",
    area: "Площадь",
    floor: "Этаж",
    bType: "Тип здания",
    landmark: "Ориентир",
    desc: "Описание",
    search: "Поиск...",
    latest: "Объявления о продаже",
    NotFound: "Ничего не найдено",
    mainSpec: "Основные характеристики",
  },
  en: {
    gallery: "Gallery",
    map: "Map",
    call: "Contact Seller",
    back: "Back",
    filter: "Filters",
    room: "Rooms",
    area: "Area",
    floor: "Floor",
    bType: "Building Type",
    landmark: "Landmark",
    desc: "Description",
    search: "Search...",
    latest: "Listings for sale",
    NotFound: "Nothing found",
    mainSpec: "Main features",
  }
}

export default function Map() {
  const [lang, setLang] = useState<"uz" | "ru" | "en">("uz")
  const t = TRANSLATIONS[lang]
  
  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  
  const [view, setView] = useState<"gallery" | "map">("gallery")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8&t=" + Date.now())
      .then((res) => res.json())
      .then((data) => setHouses(data))
  }, [])

  const filteredHouses = houses.filter(h => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return h.title.toLowerCase().includes(q) || 
      (h.crmId && h.crmId.toString().includes(q)) ||
      (h.landmark && h.landmark.toLowerCase().includes(q))
  })

  // Eng arzon uylar boshida turishi uchun (narx string bo'lgani uchun bo'shliqlarni va valyutani tozalab son qilamiz)
  const sortedHouses = [...filteredHouses].sort((a, b) => {
    const pA = parseInt(a.price.replace(/\\D/g, "")) || 0
    const pB = parseInt(b.price.replace(/\\D/g, "")) || 0
    return pA - pB
  })

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setAppliedSearch(searchQuery)
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f2f2f7]">
      
      {/* 🔴 MAP LAYER - HAMISHA ENG ORQADA */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[41.2995, 69.2401]}
          zoom={13}
          zoomControl={false}
          minZoom={12}
          maxZoom={18}
          maxBounds={[
            [41.0, 68.8],
            [41.6, 69.6],
          ]}
          maxBoundsViscosity={1.0}
          className="h-full w-full"
        >
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          />
          <MapController selected={selected} filteredHouses={filteredHouses} isSearching={searchQuery.trim().length > 0} />

          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {filteredHouses.map((h) => (
              <Marker
                key={h.id}
                position={[h.lat, h.lng]}
                icon={createPriceIcon(h.price)}
                eventHandlers={{
                  click: () => setSelected(h),
                }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* 🔵 MAP VIEW CONTROLS - Faqat karta rejimi yogilganda tepada turadi */}
      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-5 left-0 right-0 z-[10] px-4 flex gap-2 pointer-events-none items-center"
          >
            <button 
              onClick={() => setView("gallery")} 
              className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-[14px] px-3 py-3 shadow-[0_4px_15px_rgba(0,0,0,0.08)] flex items-center justify-center gap-1 border border-gray-100 flex-shrink-0 active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            
            <div className="flex-1 bg-white/95 backdrop-blur-md rounded-[14px] flex items-center px-3 py-2.5 border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.08)] pointer-events-auto">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>
              <input 
                type="text" 
                placeholder={t.search} 
                className="bg-transparent border-none outline-none ml-2 w-full text-[13px] font-bold text-gray-900 placeholder-gray-400" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setIsFilterOpen(true)} 
              className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-[14px] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.08)] border border-gray-100 flex-shrink-0 active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 🟡 GALLERY VIEW LAYER - Karta ustiga chiqadi */}
      <AnimatePresence>
        {view === "gallery" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[20] overflow-y-auto bg-[#f2f2f7]"
          >
            {/* Header Sticky */}
            <div className="sticky top-0 z-[30] bg-white rounded-b-[24px] shadow-sm flex flex-col px-4 pt-4 pb-2 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#FFD600] rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <span className="font-extrabold text-[19px] tracking-tight text-black">MULK INVEST</span>
                </div>
                <a href="https://instagram.com/mulk_invest" target="_blank" className="flex items-center gap-1.5 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-200 active:scale-95 transition-transform">
                  <svg className="w-4 h-4 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.822a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <span className="text-[12px] font-bold text-gray-800">@mulk_invest</span>
                </a>

                {/* Language Switcher */}
                <div className="relative">
                  <select 
                    value={lang}
                    onChange={(e) => setLang(e.target.value as any)}
                    className="appearance-none bg-gray-100 text-gray-800 text-[12px] font-black pl-3 pr-7 py-2 rounded-xl outline-none cursor-pointer border border-gray-200 shadow-sm"
                  >
                    <option value="uz">UZB</option>
                    <option value="ru">РУС</option>
                    <option value="en">ENG</option>
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100/80 rounded-[14px] flex items-center px-4 py-3 border border-gray-200">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>
                  <input 
                    type="text" 
                    placeholder={t.search}
                    className="bg-transparent border-none outline-none ml-2 w-full text-[14px] font-bold text-gray-900 placeholder-gray-400" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-1.5 w-full pt-1">
                <button className="flex-1 bg-[#FFD600] text-black font-extrabold py-3 rounded-[14px] text-[13px] flex justify-center items-center gap-1.5 shadow-sm border border-yellow-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
                  {t.gallery}
                </button>
                <button onClick={() => setView("map")} className="flex-1 bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] flex justify-center items-center gap-1.5 border border-gray-200 active:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                  {t.map}
                </button>
                <button onClick={() => setIsFilterOpen(true)} className="flex-[0.8] bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] flex justify-center items-center gap-1.5 border border-gray-200 active:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                  {t.filter}
                </button>
              </div>
              <div className="flex border-b border-gray-100 pb-0 mt-1">
                <span className="text-[#FFD600] font-black text-[14px] border-b-[3px] border-[#FFD600] pb-2 px-1 rounded-t-sm">{t.latest}</span>
              </div>
            </div>

            {/* Grid List for Gallery */}
            <div className="grid grid-cols-2 gap-3 p-4 pb-24">
              {sortedHouses.map((h) => (
                <div 
                  key={h.id} 
                  onClick={() => { setSelected(h); setShowDetail(true) }} // Batafsil oynani ochish
                  className="bg-white rounded-[16px] overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform"
                >
                  <div className="relative h-[120px] w-full">
                    <img src={h.image} className="w-full h-full object-cover" />
                    {h.hot && (
                      <span className="absolute top-2 right-2 bg-[#FFD600] text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">TOP</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <span className="absolute bottom-2 right-2 text-white font-bold text-[10px] drop-shadow-md">{h.area} m²</span>
                  </div>
                  <div className="p-3">
                    <p className="font-black text-gray-900 text-[14px] leading-tight mb-1">{h.price}</p>
                    <p className="text-gray-500 text-[11px] font-bold line-clamp-2 leading-snug">{h.title}</p>
                  </div>
                </div>
              ))}
              {sortedHouses.length === 0 && (
                 <div className="col-span-2 text-center text-gray-400 py-10 font-bold">Hech nima topilmadi...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 🟠 BOTTOM SHEET / CARD (Xaritada birortasini bossangiz chiqishi uchun) */}
      <AnimatePresence>
        {selected && !showDetail && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 z-[1010] bg-black/30 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
              onDragEnd={(e, info) => { if (info.offset.y > 100) setSelected(null) }}
              className="absolute bottom-0 left-0 w-full z-[1020] bg-white rounded-t-[24px] shadow-[0_-10px_40px_rgb(0,0,0,0.1)] pb-8 pt-3 px-4 md:px-0"
            >
              <div className="max-w-md mx-auto relative px-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing" />
                <div className="relative w-full h-[220px] rounded-[16px] overflow-hidden mb-4 border border-gray-100">
                  <img src={selected.image} alt={selected.title} className="object-cover w-full h-full" />
                  {selected.hot && (
                     <div className="absolute top-3 left-3 bg-[#FFD600] text-black font-extrabold text-[11px] px-3 py-1.5 rounded-md shadow-md uppercase tracking-wider">TOP E'lon</div>
                  )}
                  {selected.crmId && (
                     <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white font-bold text-[10px] px-2 py-1 rounded-md uppercase tracking-wider">ID: {selected.crmId}</div>
                  )}
                </div>
                <div className="mb-4 text-left">
                  <h2 className="text-[18px] font-black text-black leading-tight mb-1">{selected.title}</h2>
                  <p className="text-gray-500 text-[14px] line-clamp-1 leading-relaxed">{selected.description}</p>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-[16px] border border-gray-200">
                  <div className="flex flex-col ml-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Narxi</span>
                    <span className="text-2xl font-black text-black leading-none">{selected.price}</span>
                  </div>
                  <button 
                    onClick={() => setShowDetail(true)}
                    className="bg-[#FFD600] border border-yellow-400 text-black font-extrabold py-3.5 px-8 rounded-[12px] active:scale-95 transition-transform text-[14px] shadow-sm ml-2">
                    Batafsil
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔴 FULL SCREEN DETAILS VIEW */}
      <AnimatePresence>
        {showDetail && selected && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute inset-0 z-[3000] bg-white overflow-y-auto"
          >
            <div className="relative w-full h-[320px]">
              <button 
                onClick={() => {
                   setShowDetail(false); 
                   if (view === "gallery") setSelected(null);
                }} 
                className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 backdrop-blur-md flex justify-center items-center rounded-full text-white active:scale-95 transition-transform"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <img src={selected.image} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
              
              <div className="absolute bottom-5 left-5 right-5">
                 {selected.crmId && <span className="bg-[#FFD600] text-black font-extrabold px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider mb-2.5 inline-block shadow-md">ID: {selected.crmId}</span>}
                 <h1 className="text-[26px] font-black text-white leading-tight drop-shadow-lg">{selected.title}</h1>
              </div>
            </div>
            
            <div className="p-5 pb-28">
              <p className="text-3xl font-black text-black mb-6">{selected.price}</p>
              
              <div className="flex justify-around items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 shadow-sm">
                 <div className="flex flex-col items-center">
                   <svg className="w-6 h-6 text-gray-800 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                   <span className="font-black text-[16px] text-gray-900">{selected.rooms || '—'}</span>
                   <span className="text-gray-400 text-[10px] font-bold uppercase mt-0.5 tracking-wider">{t.room}</span>
                 </div>
                 <div className="w-px h-10 bg-gray-200"></div>
                 <div className="flex flex-col items-center">
                   <svg className="w-6 h-6 text-gray-800 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                   <span className="font-black text-[16px] text-gray-900">{selected.area ? selected.area + " m²" : '—'}</span>
                   <span className="text-gray-400 text-[10px] font-bold uppercase mt-0.5 tracking-wider">{t.area}</span>
                 </div>
                 <div className="w-px h-10 bg-gray-200"></div>
                 <div className="flex flex-col items-center">
                   <svg className="w-6 h-6 text-gray-800 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                   <span className="font-black text-[16px] text-gray-900">{selected.floor ? selected.floor + "/" + (selected.totalFloors || '—') : '—'}</span>
                   <span className="text-gray-400 text-[10px] font-bold uppercase mt-0.5 tracking-wider">{t.floor}</span>
                 </div>
              </div>

              {/* Qo'shimcha CRM maydonlari */}
              <div className="flex flex-col gap-1 mb-8 px-2">
                {selected.buildingType && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-500 font-bold text-[14px]">{t.bType}</span>
                    <span className="text-black font-black text-[15px]">{selected.buildingType}</span>
                  </div>
                )}
                {selected.landmark && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-500 font-bold text-[14px]">{t.landmark}</span>
                    <span className="text-black font-black text-[15px]">{selected.landmark}</span>
                  </div>
                )}
              </div>

              <h3 className="font-black text-gray-900 mb-3 text-[18px]">{t.desc}</h3>
              <p className="text-gray-600 leading-relaxed text-[15px]">
                {selected.description}
              </p>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-5 z-20">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("+998909059990");
                  alert("Raqam nusxa olindi: +998 90 905 99 90");
                  window.location.href = "tel:+998909059990";
                }}
                className="w-full bg-[#FFD600] text-black font-extrabold py-4 rounded-xl text-[16px] shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2"
              >
                <svg className="w-5 h-5 inline-block mx-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                {t.call}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 FILTER MODAL */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute inset-0 z-[4000] bg-white overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-gray-100 z-10">
              <h2 className="text-2xl font-black text-black">{t.filter}</h2>
              <button onClick={() => setIsFilterOpen(false)} className="bg-gray-100 p-2.5 rounded-full text-gray-800 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            {/* Same filter body ... omitted long duplicate content for brevity, using same as before */}
            <div className="p-5 space-y-5 pb-32">
              <div>
                <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Tuman / Ko'cha</label>
                <input type="text" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-colors" placeholder="Yozing..." />
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Narx (dan)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="0 $" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Narx (gacha)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="Max" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Xonalar (dan)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="1" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Xonalar (gacha)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="5" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Maydon m² (dan)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="30" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Maydon m² (gacha)</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="200" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Qavat</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="Etaj" />
                </div>
                <div className="flex-[2]">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block">Turar joy majmuasi</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 focus:border-[#FFD600] rounded-xl px-4 py-3 outline-none font-bold text-gray-900" placeholder="Nomi" />
                </div>
              </div>
            </div>
            
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-5">
              <button onClick={() => setIsFilterOpen(false)} className="w-full bg-[#FFD600] text-black font-extrabold py-4 rounded-xl text-[16px] shadow-sm active:scale-95 transition-all">
                Natijalarni ko'rsatish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}