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

// 🔥 PRICE ICON
const createPriceIcon = (price: string, hot: boolean) =>
  L.divIcon({
    html: `
      <div style="
        position: relative;
        transform: translate(-50%, -100%);
        background: ${hot ? "#ef4444" : "#FFD600"};
        color: #000;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      ">
        ${price}
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${hot ? "#ef4444" : "#FFD600"};
        "></div>
      </div>
    `,
    className: "",
  })

// 🔥 CLUSTER ICON
const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `
      <div style="
        background:#16a34a;
        color:white;
        width:40px;
        height:40px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
      ">
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
}

// 🔥 ZOOM
function FlyToMarker({ selected }: { selected: House | null }) {
  const map = useMap()

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, {
        duration: 0.5,
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
    <>
      {/* 🔥 TOP BAR */}
      <div
        style={{
          position: "fixed",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "white",
          padding: "10px 16px",
          borderRadius: "20px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        🏠 Mulk Invest — Rieltor panel
      </div>

      {/* MAP */}
      <div style={{ height: "100vh", width: "100%" }}>
        <MapContainer
          center={[41.2995, 69.2401]}
          zoom={13}
          minZoom={11}
          maxZoom={18}
          maxBounds={[
            [41.0, 68.8],
            [41.6, 69.6],
          ]}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

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

      {/* 🔥 BOTTOM CARD */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            onDragEnd={(e, info) => {
              if (info.offset.y > 120) setSelected(null)
            }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              background: "white",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "16px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "#ccc",
                borderRadius: "10px",
                margin: "0 auto 10px",
              }}
            />

            <h2 style={{ fontWeight: "700" }}>{selected.price}</h2>

            <p style={{ color: "#666" }}>
              {selected.hot ? "🔥 Tez sotiladi" : "Oddiy uy"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}