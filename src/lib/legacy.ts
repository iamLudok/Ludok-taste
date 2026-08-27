/**
 * Lectura de las copias de la PWA (`{app:'ludrest', version:1}`).
 *
 * Aquella versión guardaba en IndexedDB: las fechas de creación eran texto ISO
 * con hora, los precios cadenas escritas a mano («2,50»), los campos vacíos
 * cadenas en blanco y las fotos `data:` URLs. Todo eso se traduce aquí, en un
 * único sitio y sin tocar la base de datos, para que el resto del importador no
 * tenga que saber nada del formato viejo.
 */
import { SCHEMA_VERSION } from './version'
import { parsePrice, trimmed } from './rows'
import { todayISO } from './dates'
import type { BackupFile, Dish, Restaurant, Tasting } from '../types'

interface LegacyFile {
  app: string
  version: number
  exportedAt?: string
  restaurants?: unknown[]
  dishes?: unknown[]
  tastings?: unknown[]
}

/** ¿Es una copia de la PWA? Se distingue por `version` en vez de `schemaVersion`. */
export function isLegacyBackup(data: unknown): data is LegacyFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d.app === 'ludrest' && typeof d.version === 'number' && d.schemaVersion === undefined
}

/** Texto ISO con hora (`2026-07-12T18:30:00.000Z`) a milisegundos. */
function toMillis(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? trimmed(value) : undefined
}

export function convertLegacy(data: LegacyFile): BackupFile {
  const exportedAt = toMillis(data.exportedAt, Date.now())

  const restaurants: Restaurant[] = (data.restaurants ?? []).flatMap((raw) => {
    const r = raw as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.name !== 'string') return []
    const createdAt = toMillis(r.createdAt, exportedAt)
    return [
      {
        id: r.id,
        name: r.name.trim(),
        city: str(r.city),
        notes: str(r.notes),
        createdAt,
        updatedAt: createdAt,
      },
    ]
  })

  const dishes: Dish[] = (data.dishes ?? []).flatMap((raw) => {
    const d = raw as Record<string, unknown>
    if (typeof d.id !== 'string' || typeof d.restaurantId !== 'string' || typeof d.name !== 'string') {
      return []
    }
    const createdAt = toMillis(d.createdAt, exportedAt)
    return [
      {
        id: d.id,
        restaurantId: d.restaurantId,
        name: d.name.trim(),
        category: str(d.category),
        // El precio era texto libre; si no se puede leer como número se pierde
        // el dato antes que inventarse un 0, que sí significaría algo.
        price: typeof d.price === 'number' ? d.price : parsePrice(str(d.price)),
        description: str(d.description),
        archived: !!d.archived,
        createdAt,
        updatedAt: createdAt,
      },
    ]
  })

  const tastings: Tasting[] = (data.tastings ?? []).flatMap((raw) => {
    const t = raw as Record<string, unknown>
    if (typeof t.id !== 'string' || typeof t.dishId !== 'string') return []
    const rating = typeof t.rating === 'number' && t.rating > 0 ? t.rating : undefined
    return [
      {
        id: t.id,
        dishId: t.dishId,
        restaurantId: typeof t.restaurantId === 'string' ? t.restaurantId : '',
        date: typeof t.date === 'string' && t.date ? t.date : todayISO(new Date(exportedAt)),
        rating,
        note: str(t.note),
        photo: typeof t.photo === 'string' && t.photo.startsWith('data:') ? t.photo : undefined,
        createdAt: toMillis(t.createdAt, exportedAt),
      },
    ]
  })

  // La PWA guardaba el restaurante en cada degustación, pero por si acaso viene
  // vacío se rellena desde el plato: sin eso, esa degustación no aparecería en
  // el restaurante y el progreso saldría mal.
  const restaurantByDish = new Map(dishes.map((d) => [d.id, d.restaurantId]))
  for (const t of tastings) {
    if (!t.restaurantId) t.restaurantId = restaurantByDish.get(t.dishId) ?? ''
  }

  return {
    app: 'ludrest',
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    restaurants,
    dishes,
    tastings,
    settings: null,
  }
}
