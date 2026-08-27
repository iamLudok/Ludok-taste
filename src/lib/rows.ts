// Traducción entre las filas de SQLite y el modelo de dominio.
//
// SQLite devuelve `null` en las columnas vacías, pero los tipos de la app (y el
// formato de las copias) usan `undefined`, que `JSON.stringify` elimina. Pasar
// de uno a otro explícitamente es lo que mantiene «sin ciudad» distinto de
// «ciudad vacía» en los ficheros de copia.
import { SCHEMA_VERSION } from './version'
import type {
  restaurants,
  dishes,
  tastings,
  settings,
  RestaurantRow,
  DishRow,
  TastingRow,
  SettingsRow,
} from './schema'
import type { Restaurant, Dish, Tasting, Settings } from '../types'

type RestaurantInsert = typeof restaurants.$inferInsert
type DishInsert = typeof dishes.$inferInsert
type TastingInsert = typeof tastings.$inferInsert
type SettingsInsert = typeof settings.$inferInsert

/** null → undefined */
const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v)
/** undefined → null */
const n = <T>(v: T | undefined): T | null => (v === undefined ? null : v)

/**
 * Texto de un formulario a campo del modelo: lo que se deja en blanco no es una
 * cadena vacía, es que no está. Así una ciudad borrada desaparece de verdad en
 * vez de quedarse como `""` en las copias.
 */
export function trimmed(value: string | undefined): string | undefined {
  const t = value?.trim()
  return t ? t : undefined
}

/** Precio escrito a mano ('2,50', '2.50', ' ') a número de euros. */
export function parsePrice(value: string | undefined): number | undefined {
  const t = value?.trim().replace(',', '.')
  if (!t) return undefined
  const parsed = Number(t)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function rowToRestaurant(r: RestaurantRow): Restaurant {
  return {
    id: r.id,
    name: r.name,
    city: u(r.city),
    notes: u(r.notes),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function restaurantToRow(r: Restaurant): RestaurantInsert {
  return {
    id: r.id,
    name: r.name,
    city: n(r.city),
    notes: n(r.notes),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function rowToDish(d: DishRow): Dish {
  return {
    id: d.id,
    restaurantId: d.restaurantId,
    name: d.name,
    category: u(d.category),
    price: u(d.price),
    description: u(d.description),
    archived: d.archived,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function dishToRow(d: Dish): DishInsert {
  return {
    id: d.id,
    restaurantId: d.restaurantId,
    name: d.name,
    category: n(d.category),
    price: n(d.price),
    description: n(d.description),
    archived: !!d.archived,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function rowToTasting(t: TastingRow): Tasting {
  return {
    id: t.id,
    dishId: t.dishId,
    restaurantId: t.restaurantId,
    date: t.date,
    rating: u(t.rating),
    note: u(t.note),
    photo: u(t.photo),
    createdAt: t.createdAt,
  }
}

export function tastingToRow(t: Tasting): TastingInsert {
  return {
    id: t.id,
    dishId: t.dishId,
    restaurantId: t.restaurantId,
    date: t.date,
    rating: n(t.rating),
    note: n(t.note),
    photo: n(t.photo),
    createdAt: t.createdAt,
  }
}

export function rowToSettings(r: SettingsRow): Settings {
  return {
    id: 'app',
    theme: r.theme,
    lastBackup: r.lastBackup,
    schemaVersion: r.schemaVersion,
    nextcloudUrl: u(r.nextcloudUrl),
    nextcloudUser: u(r.nextcloudUser),
    nextcloudPassword: u(r.nextcloudPassword),
    nextcloudFolder: u(r.nextcloudFolder),
    autoBackup: u(r.autoBackup),
    lastAutoBackupAt: u(r.lastAutoBackupAt),
  }
}

export function settingsToRow(s: Settings): SettingsInsert {
  return {
    id: 'app',
    theme: s.theme,
    lastBackup: s.lastBackup,
    schemaVersion: s.schemaVersion ?? SCHEMA_VERSION,
    nextcloudUrl: n(s.nextcloudUrl),
    nextcloudUser: n(s.nextcloudUser),
    nextcloudPassword: n(s.nextcloudPassword),
    nextcloudFolder: n(s.nextcloudFolder),
    autoBackup: n(s.autoBackup),
    lastAutoBackupAt: n(s.lastAutoBackupAt),
  }
}
