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

// Joymee uslubidagi marker
const createPriceIcon = (price: string) =>
  L.divIcon({
    html: `
      <div class="relative flex items-center justify-center px-2.5 py-1.5 rounded-[6px] font-extrabold text-[12px] shadow-sm transition-transform duration-200 hover:scale-110 bg-[#FFD600] text-black border border-yellow-500/50">
        ${price}
        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFD600]"></div>
      </div>
    `,
    className: "",
  })

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `
      <div class="bg-[#FFD600] text-black w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[13px] shadow-md border-2 border-white">
        ${count}
      </div>
    `,
    className: "",
  })
}

type House = {
  id: number
  lat: number
  lng: number
  price: string
  hot: boolean
  title: string
  description: string
  image: string
}

function FlyToMarker({ selected }: { selected: House | null }) {
  const map = useMap()

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat - 0.007, selected.lng], 15, {
        duration: 0.8,
        easeLinearity: 0.25,
      })
    }
  }, [selected])

  return null
}

export default function Map() {
  const [houses, setHouses] = useState<House[]>([])
  const [selected, setSelected] = useState<House | null>(null)
  
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8")
      .then((res) => res.json())
      .then((data) => setHouses(data))
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f2f2f7]">
      
      {/* 🌟 TEPADAGI JOYMEE STYLE HEADER */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white rounded-b-[24px] shadow-sm flex flex-col px-4 pt-4 pb-2 space-y-3">
        
        {/* LOGO & INSTAGRAM */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FFD600] rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <span className="font-extrabold text-[19px] tracking-tight text-black">MULK INVEST</span>
          </div>
          
          <a href="https://instagram.com/mulk_invest" target="_blank" className="flex items-center gap-1.5 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-200 active:scale-95 transition-transform">
            {/* Instagram Icon */}
            <svg className="w-4 h-4 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.822a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            <span className="text-[12px] font-bold text-gray-800">@mulk_invest</span>
          </a>
        </div>

        {/* SEARCH BAR */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-100/80 rounded-[14px] flex items-center px-4 py-3 border border-gray-200">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Qidirish... (Tuman, ko'cha)" 
              className="bg-transparent border-none outline-none ml-2 w-full text-[14px] font-bold text-gray-900 placeholder-gray-400" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* BUTTONS ROW */}
        <div className="flex gap-2 w-full pt-1">
          <button className="flex-1 bg-[#FFD600] text-black font-extrabold py-3 rounded-[14px] text-[14px] flex justify-center items-center gap-2 shadow-sm border border-yellow-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            Xaritada
          </button>
          <button onClick={() => setIsFilterOpen(true)} className="flex-1 bg-gray-100 text-gray-800 font-extrabold py-3 rounded-[14px] text-[14px] flex justify-center items-center gap-2 border border-gray-200 active:bg-gray-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filtrlar
          </button>
        </div>

        {/* SALE ONLY TABS */}
        <div className="flex gap-6 border-b border-gray-100 pb-0 mt-1">
          <span className="text-[#FFD600] font-black text-[14px] border-b-[3px] border-[#FFD600] pb-2 px-1 rounded-t-sm">Sotuv</span>
          <span className="text-gray-300 font-bold text-[14px] pb-2 px-1 cursor-not-allowed">Ijara (Tez kunda)</span>
        </div>
      </div>

      {/* MAP */}
      <div className="h-full w-full pt-[180px]">
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
          {/* Classical Map look comparable to Joymee screenshots */}
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          />

          <FlyToMarker selected={selected} />

          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {houses.map((h) => (
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

      {/* FILTER MODAL */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute inset-0 z-[2000] bg-white overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-gray-100 z-10">
              <h2 className="text-2xl font-black text-black">Filtrlar</h2>
              <button onClick={() => setIsFilterOpen(false)} className="bg-gray-100 p-2.5 rounded-full text-gray-800 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
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

      {/* BOTTOM SHEET / CARD */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 z-[999] bg-black/30 backdrop-blur-[1px]"
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) setSelected(null)
              }}
              className="absolute bottom-0 left-0 w-full z-[1000] bg-white rounded-t-[24px] shadow-2xl pb-8 pt-3 px-4 md:px-0"
            >
              <div className="max-w-md mx-auto relative px-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing" />
                
                <div className="relative w-full h-[220px] rounded-[16px] overflow-hidden mb-4 border border-gray-100">
                  {selected.image ? (
                    <img
                      src={selected.image}
                      alt={selected.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 animate-pulse" />
                  )}
                  {selected.hot && (
                    <div className="absolute top-3 left-3 bg-[#FFD600] text-black font-extrabold text-[11px] px-3 py-1.5 rounded-md shadow-md uppercase">
                      TOP E'lon
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h2 className="text-[18px] font-black text-gray-900 leading-tight mb-1">{selected.title}</h2>
                  <p className="text-gray-500 text-[14px] line-clamp-2 leading-relaxed">{selected.description}</p>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase mb-0.5">Narxi</p>
                    <p className="text-2xl font-black text-black">{selected.price}</p>
                  </div>
                  <button className="bg-[#FFD600] text-black font-extrabold py-3 px-6 rounded-xl active:scale-95 transition-transform text-[14px]">
                    Batafsil
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}