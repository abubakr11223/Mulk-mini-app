// ─────────────────────────────────────────────────────────────────────────────
// lib/amo-cache.ts
// Global in-memory cache — barcha route'lar ushbu modulni import qiladi
// ─────────────────────────────────────────────────────────────────────────────

export interface House {
  id: number
  title: string
  lat: number
  lng: number
  price: number
  oldPrice: number    // Eskig narx (skidka uchun), 0 bo'lsa skidka yo'q
  rooms: number
  area: number
  floor: number
  totalFloors: number
  district: string
  description: string
  landmark: string
  jk: string
  yandex_url: string
  updatedAt: number   // Unix timestamp (amoCRM'dan)
  isTop: boolean      // status_id === 85232970 ("ТОП ЛУЧШИЕ (APP)")
}

interface Cache {
  data: House[]
  ts: number          // Cache saqlangan vaqt (Date.now())
}

// Global (server process hayoti davomida saqlanadi)
declare global {
  // eslint-disable-next-line no-var
  var __amoCache: Cache | null
}

if (!global.__amoCache) global.__amoCache = null

export const TTL = 60 * 1000   // 60 sekund (CRM o'zgarishlar tez ko'rinsin)

export function getCache(): Cache | null {
  return global.__amoCache
}

export function setCache(data: House[]) {
  global.__amoCache = { data, ts: Date.now() }
}

export function clearCache() {
  global.__amoCache = null
}

export function isFresh(): boolean {
  return !!global.__amoCache && Date.now() - global.__amoCache.ts < TTL
}
