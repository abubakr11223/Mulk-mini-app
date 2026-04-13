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
      <div class="relative -translate-x-1/2 -translate-y-full px-4 py-2 rounded-full font-extrabold text-sm whitespace-nowrap shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-transform duration-300 hover:scale-105 ${hot ? 'bg-[#ff3b30] text-white' : 'bg-[#1c1c1e] text-white'} border-[3px] border-white">
        ${price}
        <div class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] ${hot ? 'border-t-[#ff3b30]' : 'border-t-[#1c1c1e]'}"></div>
      </div>
    `,
    className: "",
  })

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `
      <div class="bg-[#1c1c1e]/90 backdrop-blur-md text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-xl border-4 border-white">
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
      // Offset center slightly to leave room for the bottom sheet
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

  useEffect(() => {
    fetch("/api/houses?north=41.6&south=41.0&east=69.6&west=68.8")
      .then((res) => res.json())
      .then((data) => setHouses(data))
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#f2f2f7]">
      {/* TOP HEADER */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm rounded-[24px] bg-white/70 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 p-2 pl-5 flex items-center justify-between">
        <h1 className="font-bold text-[#1c1c1e] tracking-tight text-lg">Mulk Invest</h1>
        <span className="text-[11px] font-bold bg-[#1c1c1e] text-white px-3 py-1.5 rounded-full uppercase tracking-wider">
          Rieltor yopiq bazasi
        </span>
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
          {/* Voyager basemap for cleaner map UI */}
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

      {/* BOTTOM SHEET / CARD */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Backdrop to dull the map */}
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
              // Make sure z-[1000] puts it above map
              className="absolute bottom-0 left-0 w-full z-[1000] bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgb(0,0,0,0.15)] pb-10 pt-3 px-4 md:px-0"
            >
              <div className="max-w-md mx-auto relative px-1">
                {/* Drag handle */}
                <div className="w-14 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 cursor-grab active:cursor-grabbing" />
                
                {/* Image Section */}
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

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {selected.hot && (
                    <div className="absolute top-4 left-4 bg-[#ff3b30] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-md">
                      🔥 Tez sotiladi
                    </div>
                  )}

                  {/* Title overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md">{selected.title}</h2>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6 px-1">
                  <p className="text-[#8e8e93] text-[15px] line-clamp-2 leading-relaxed">{selected.description}</p>
                </div>
                
                {/* Bottom Stats & Button */}
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