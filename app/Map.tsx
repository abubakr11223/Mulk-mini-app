"use client"

import { useEffect, useMemo, useState } from "react"
import L from "leaflet"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import { AnimatePresence, motion } from "framer-motion"
import "leaflet/dist/leaflet.css"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

type House = {
  id: string
  title: string
  description: string
  price: string
  lat: number
  lng: number
  image: string
  images?: string[]
  rooms?: string
  area?: string
  floor?: string
  buildingType?: string
  landmark?: string
  hot?: boolean
  crmId?: string
}

const TRANSLATIONS = {
  uz: {
    gallery: "E'lonlar lentalari",
    map: "Karta",
    call: "Sotuvchi bilan bog'lanish",
    back: "Orqaga",
    filter: "Filterlar",
    room: "Xonalar soni",
    area: "Maydon",
    floor: "Qavat",
    bType: "Uy turi",
    landmark: "Mo'ljal",
    desc: "Batafsil ma'lumot",
    search: "Qidirish...",
    latest: "Sotuvdagi e'lonlar",
    notFound: "Hech narsa topilmadi",
    mainSpec: "Asosiy ko'rsatkichlar",
  },
  ru: {
    gallery: "Лента объявлений",
    map: "Карта",
    call: "Связаться с продавцом",
    back: "Назад",
    filter: "Фильтры",
    room: "Количество комнат",
    area: "Площадь",
    floor: "Этаж",
    bType: "Тип здания",
    landmark: "Ориентир",
    desc: "Описание",
    search: "Поиск...",
    latest: "Объявления о продаже",
    notFound: "Ничего не найдено",
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
    notFound: "Nothing found",
    mainSpec: "Main features",
  },
}

const createPriceIcon = (price: string) =>
  L.divIcon({
    html: `
 <div class="relative flex items-center justify-center px-3 py-1 rounded-[6px] font-extrabold text-[13px] tracking-tight shadow-md transition-transform duration-200 hover:scale-110 bg-[#FFD600] text-black border border-yellow-500/50 whitespace-nowrap">
 ${price.replace(/\s+/g, "")}
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

function MapController({
  selected,
  filteredHouses,
  isSearching,
}: {
  selected: House | null
  filteredHouses: House[]
  isSearching: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, { duration: 0.8 })
    }
  }, [selected, map])

  useEffect(() => {
    if (isSearching && filteredHouses.length > 0) {
      const group = L.featureGroup(
        filteredHouses.map((h) =>
          L.marker([h.lat, h.lng], { icon: createPriceIcon(h.price) })
        )
      )
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [isSearching, filteredHouses, map])

  return null
}

export default function Map() {
  const [lang, setLang] = useState<"uz" | "ru" | "en">("uz")
  const t = TRANSLATIONS[lang]

  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  const [view, setView] = useState<"gallery" | "map">("gallery")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8&t=" + Date.now())
      .then((res) => res.json())
      .then((data) => setHouses(Array.isArray(data) ? data : []))
      .catch(() => setHouses([]))
  }, [])

  const filteredHouses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return houses
    return houses.filter((h) =>
      [h.title, h.description, h.landmark]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    )
  }, [houses, searchQuery])

  const center: [number, number] = [41.3111, 69.2797]
  const bounds: L.LatLngBoundsExpression = [
    [41.0, 68.8],
    [41.6, 69.6],
  ]

  return (
    <div className="relative w-full h-screen bg-[#f5f5f7] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController
            selected={selected}
            filteredHouses={filteredHouses}
            isSearching={searchQuery.trim().length > 0}
          />

          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {filteredHouses.map((h) => (
              <Marker
                key={h.id}
                position={[h.lat, h.lng]}
                icon={createPriceIcon(h.price)}
                eventHandlers={{
                  click: () => {
                    setSelected(h)
                    setView("map")
                  },
                }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <AnimatePresence>
        {view === "map" && !selected && !showDetail && !isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-5 left-0 right-0 z-[10] px-4 flex gap-2 pointer-events-none items-center"
          >
            <button
              onClick={() => setView("gallery")}
              className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-[14px] px-3 py-3 shadow-[0_4px_15px_rgba(0,0,0,0.08)] flex items-center justify-center gap-1 border border-gray-100 flex-shrink-0 active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 bg-white/95 backdrop-blur-md rounded-[14px] flex items-center px-3 py-2.5 border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.08)] pointer-events-auto">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
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
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === "gallery" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[20] overflow-y-auto bg-[#f2f2f7]"
          >
            <div className="sticky top-0 z-30 bg-[#f2f2f7]/95 backdrop-blur-md border-b border-gray-200 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-[0.13em] font-black text-gray-500">
                    MULK INVEST
                  </span>
                  <h1 className="text-[19px] font-black text-black tracking-tight leading-tight">
                    Premium ko‘chmas mulk e'lonlari
                  </h1>
                </div>

                <a
                  href="https://t.me/mulk_invest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-end gap-1"
                >
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-[999px] bg-black text-white text-[11px] font-bold">
                    <span className="font-black">@mulk_invest</span>
                  </div>
                  <span className="text-[12px] font-bold text-gray-800">@mulk_invest</span>
                </a>

                <div className="relative">
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as "uz" | "ru" | "en")}
                    className="appearance-none bg-gray-100 text-gray-800 text-[12px] font-black pl-3 pr-7 py-2 rounded-xl outline-none cursor-pointer border border-gray-200 shadow-sm"
                  >
                    <option value="uz">UZB</option>
                    <option value="ru">РУС</option>
                    <option value="en">ENG</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100/80 rounded-[14px] flex items-center px-4 py-3 border border-gray-200">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
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
                  {t.gallery}
                </button>
                <button
                  onClick={() => setView("map")}
                  className="flex-1 bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] flex justify-center items-center gap-1.5 border border-gray-200 active:bg-gray-200 transition-colors"
                >
                  {t.map}
                </button>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex-[0.8] bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[13px] flex justify-center items-center gap-1.5 border border-gray-200 active:bg-gray-200 transition-colors"
                >
                  {t.filter}
                </button>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="text-[14px]
