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

const createPriceIcon = (price: string, hot: boolean) =>
  L.divIcon({
    html: `
      <div class="relative flex items-center justify-center min-w-[50px] px-2 py-1.5 rounded-full font-bold text-[12px] shadow-md transition-transform duration-300 hover:scale-110 ${hot ? 'bg-[#ff3b30] text-white' : 'bg-[#1c1c1e] text-white'} border-[2px] border-white">
        ${price.replace(" ", "")}
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${hot ? 'border-t-[#ff3b30]' : 'border-t-[#1c1c1e]'}"></div>
      </div>
    `,
    className: "",
  })

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `
      <div class="bg-[#1c1c1e]/90 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xl border-[2px] border-white backdrop-blur-sm">
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
      
      {/* TOP SEARCH & FILTER BAR */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
        <div className="flex-1 bg-white/80 backdrop-blur-2xl shadow-sm rounded-[20px] flex items-center px-4 py-3 border border-white/60">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Manzil yoki CRM ID qidiruv..." 
            className="bg-transparent border-none outline-none ml-2 w-full text-[15px] font-semibold text-[#1c1c1e] placeholder-gray-400" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setIsFilterOpen(true)} 
          className="bg-white/80 backdrop-blur-2xl shadow-sm rounded-[20px] px-4 flex items-center justify-center border border-white/60 active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6 text-[#1c1c1e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
          </svg>
        </button>
      </div>

      {/* MAP */}
      <div className="h-full w-full">
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

          <FlyToMarker selected={selected} />

          <MarkerClusterGroup iconCreateFunction={createClusterIcon}>
            {houses.map((h) => (
              <Marker
                key={h.id}
                position={[h.lat, h.lng]}
                icon={createPriceIcon(h.price, h.hot)}
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
            className="absolute inset-0 z-[2000] bg-[#f2f2f7] overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#f2f2f7]/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-gray-200 z-10">
              <h2 className="text-2xl font-bold text-[#1c1c1e]">Sohalar filtri</h2>
              <button onClick={() => setIsFilterOpen(false)} className="bg-gray-200/80 p-2.5 rounded-full text-gray-700 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-5 space-y-5 pb-32">
              {/* Tuman */}
              <div>
                <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Tumanlar</label>
                <input type="text" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm transition-colors" placeholder="Tuman kiriting (Yunusobod, Chilonzor...)" />
              </div>
              
              {/* Narx */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Narx (dan)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="0 $" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Narx (gacha)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="100 000 $" />
                </div>
              </div>

              {/* Xona kol-vo */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Xonalar (dan)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="1" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Xonalar (gacha)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="5" />
                </div>
              </div>

              {/* Ploshad */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Yuzasi m² (dan)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="30" />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Yuzasi m² (gacha)</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="120" />
                </div>
              </div>

              {/* Obyekt / Etaj */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Etaj</label>
                  <input type="number" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="Qavat" />
                </div>
                <div className="flex-[2]">
                  <label className="text-[13px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Turar joy majmuasi</label>
                  <input type="text" className="w-full bg-white border border-transparent focus:border-[#007aff] rounded-2xl px-4 py-3.5 outline-none font-semibold text-[#1c1c1e] shadow-sm" placeholder="M-n: Nest One..." />
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-[#f2f2f7]/90 backdrop-blur-xl border-t border-gray-200 p-5">
              <button onClick={() => setIsFilterOpen(false)} className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white font-bold py-4 rounded-2xl text-[17px] shadow-[0_8px_20px_rgb(0,122,255,0.3)] active:scale-95 transition-all">
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
              className="absolute inset-0 z-[999] bg-[#1c1c1e]/10 backdrop-blur-[2px]"
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
              className="absolute bottom-0 left-0 w-full z-[1000] bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgb(0,0,0,0.15)] pb-10 pt-3 px-4 md:px-0"
            >
              <div className="max-w-md mx-auto relative px-1">
                <div className="w-14 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 cursor-grab active:cursor-grabbing" />
                
                <div className="relative w-full h-[240px] rounded-[24px] overflow-hidden mb-5 shadow-sm group">
                  {selected.image ? (
                    <img
                      src={selected.image}
                      alt={selected.title}
                      className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {selected.hot && (
                    <div className="absolute top-4 left-4 bg-[#ff3b30] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-md">
                      🔥 Tez sotiladi
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md">{selected.title}</h2>
                  </div>
                </div>

                <div className="mb-6 px-1">
                  <p className="text-[#8e8e93] text-[15px] line-clamp-2 leading-relaxed">{selected.description}</p>
                </div>
                
                <div className="flex justify-between items-center px-1">
                  <div>
                    <p className="text-[11px] text-[#8e8e93] font-bold uppercase tracking-wider mb-1">So'ralayotgan narx</p>
                    <p className="text-3xl font-black text-[#1c1c1e] tracking-tight">{selected.price}</p>
                  </div>
                  <button className="bg-[#007aff] hover:bg-[#0056b3] text-white font-bold py-3.5 px-7 rounded-[18px] shadow-[0_8px_20px_rgb(0,122,255,0.3)] active:scale-95 transition-all text-[15px]">
                    Ko'rish
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