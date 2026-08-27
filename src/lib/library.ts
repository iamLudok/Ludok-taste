// Altas, bajas y cálculos sobre restaurantes, platos y degustaciones.
//
// Las funciones de cálculo son puras (reciben las listas y no tocan la base),
// para poder comprobarlas en el escritorio; las de escritura piden la base a
// `dbRef`. Ningún import nativo aquí dentro.
import { eq, inArray } from 'drizzle-orm'
import { getDb } from './dbRef'
import { restaurants as restaurantsTable, dishes as dishesTable, tastings as tastingsTable } from './schema'
import { rowToDish, rowToTasting, dishToRow, restaurantToRow, tastingToRow } from './rows'
import { newId } from './ids'
import type { Dish, Restaurant, Tasting } from '../types'

/* ------------------------------------------------------------------ */
/* Escritura                                                           */
/* ------------------------------------------------------------------ */

export interface RestaurantInput {
  /** Ausente = restaurante nuevo. */
  id?: string
  name: string
  city?: string
  notes?: string
}

/** Crea o actualiza un restaurante. Devuelve su id. */
export async function saveRestaurant(input: RestaurantInput): Promise<string> {
  const db = getDb()
  const now = Date.now()
  const existing = input.id
    ? (await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, input.id)).limit(1))[0]
    : undefined

  const restaurant: Restaurant = {
    id: existing?.id ?? input.id ?? newId(),
    name: input.name.trim(),
    city: input.city,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const row = restaurantToRow(restaurant)
  await db.insert(restaurantsTable).values(row).onConflictDoUpdate({ target: restaurantsTable.id, set: row })
  return restaurant.id
}

export interface DishInput {
  id?: string
  restaurantId: string
  name: string
  category?: string
  price?: number
  description?: string
  archived?: boolean
}

/** Crea o actualiza un plato. Devuelve su id. */
export async function saveDish(input: DishInput): Promise<string> {
  const db = getDb()
  const now = Date.now()
  const existing = input.id
    ? (await db.select().from(dishesTable).where(eq(dishesTable.id, input.id)).limit(1))[0]
    : undefined

  const dish: Dish = {
    id: existing?.id ?? input.id ?? newId(),
    restaurantId: existing?.restaurantId ?? input.restaurantId,
    name: input.name.trim(),
    category: input.category,
    price: input.price,
    description: input.description,
    archived: input.archived ?? existing?.archived ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const row = dishToRow(dish)
  await db.insert(dishesTable).values(row).onConflictDoUpdate({ target: dishesTable.id, set: row })
  return dish.id
}

export interface TastingInput {
  dishId: string
  restaurantId: string
  date: string
  rating?: number
  note?: string
  /** Nombre del fichero de la foto, ya guardada en disco. */
  photo?: string
}

/** Apunta que has comido un plato. Devuelve el id de la degustación. */
export async function addTasting(input: TastingInput): Promise<string> {
  const tasting: Tasting = { id: newId(), createdAt: Date.now(), ...input }
  await getDb().insert(tastingsTable).values(tastingToRow(tasting))
  return tasting.id
}

/**
 * Las funciones de borrado devuelven los nombres de las fotos que se quedan
 * huérfanas, en vez de borrarlas ellas: los ficheros son cosa de
 * `photos.ts`, que sí es nativo, y este módulo tiene que seguir siendo
 * ejecutable en el escritorio. Quien borra llama después a `deletePhotos()`.
 */
export async function deleteTasting(id: string): Promise<string[]> {
  const db = getDb()
  const rows = await db.select().from(tastingsTable).where(eq(tastingsTable.id, id)).limit(1)
  await db.delete(tastingsTable).where(eq(tastingsTable.id, id))
  return rows[0]?.photo ? [rows[0].photo] : []
}

/** Borra un plato con todo su historial. Devuelve las fotos huérfanas. */
export async function deleteDishDeep(dishId: string): Promise<string[]> {
  const db = getDb()
  const rows = await db.select().from(tastingsTable).where(eq(tastingsTable.dishId, dishId))
  await db.delete(tastingsTable).where(eq(tastingsTable.dishId, dishId))
  await db.delete(dishesTable).where(eq(dishesTable.id, dishId))
  return rows.map((t) => t.photo).filter((p): p is string => !!p)
}

/** Borra un restaurante con su carta y su historial. Devuelve las fotos huérfanas. */
export async function deleteRestaurantDeep(restaurantId: string): Promise<string[]> {
  const db = getDb()
  const rows = await db.select().from(tastingsTable).where(eq(tastingsTable.restaurantId, restaurantId))
  await db.delete(tastingsTable).where(eq(tastingsTable.restaurantId, restaurantId))
  await db.delete(dishesTable).where(eq(dishesTable.restaurantId, restaurantId))
  await db.delete(restaurantsTable).where(eq(restaurantsTable.id, restaurantId))
  return rows.map((t) => t.photo).filter((p): p is string => !!p)
}

/* ------------------------------------------------------------------ */
/* Lectura puntual (fuera de las consultas en vivo)                    */
/* ------------------------------------------------------------------ */

export async function getDish(id: string): Promise<Dish | undefined> {
  const rows = await getDb().select().from(dishesTable).where(eq(dishesTable.id, id)).limit(1)
  return rows[0] ? rowToDish(rows[0]) : undefined
}

export async function getTastingsOfDishes(dishIds: string[]): Promise<Tasting[]> {
  if (!dishIds.length) return []
  const rows = await getDb().select().from(tastingsTable).where(inArray(tastingsTable.dishId, dishIds))
  return rows.map(rowToTasting)
}

/* ------------------------------------------------------------------ */
/* Cálculos (puros)                                                    */
/* ------------------------------------------------------------------ */

/** Agrupa las degustaciones por plato. La base de casi todo lo demás. */
export function byDish(tastings: Tasting[]): Map<string, Tasting[]> {
  const map = new Map<string, Tasting[]>()
  for (const t of tastings) {
    const list = map.get(t.dishId) ?? []
    list.push(t)
    map.set(t.dishId, list)
  }
  return map
}

/** Nota media de una lista de degustaciones. null si ninguna tiene nota. */
export function avgRating(tastings: Tasting[]): number | null {
  const rated = tastings.filter((t) => t.rating)
  if (!rated.length) return null
  return rated.reduce((a, t) => a + (t.rating ?? 0), 0) / rated.length
}

export interface DishSummary {
  count: number
  avg: number | null
  /** Última vez que se comió (fecha ISO), o undefined si nunca. */
  last?: string
}

export function summarize(tastings: Tasting[]): DishSummary {
  const last = tastings.reduce<string | undefined>(
    (acc, t) => (acc === undefined || t.date > acc ? t.date : acc),
    undefined,
  )
  return { count: tastings.length, avg: avgRating(tastings), last }
}

export interface Progress {
  tried: number
  total: number
  /** 0–100, entero. */
  percent: number
  complete: boolean
}

/**
 * Progreso de una carta. Los platos que ya no están no cuentan: si no se puede
 * pedir, tenerlo pendiente para siempre convertiría el 100% en inalcanzable.
 */
export function progressOf(dishes: Dish[], tastings: Tasting[]): Progress {
  const active = dishes.filter((d) => !d.archived)
  const tried = new Set(tastings.map((t) => t.dishId))
  const done = active.filter((d) => tried.has(d.id)).length
  const total = active.length
  return {
    tried: done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
  }
}

/** Ordena la carta: primero lo que se puede pedir, y dentro por nombre. */
export function sortDishes(dishes: Dish[]): Dish[] {
  return [...dishes].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name, 'es'),
  )
}

/** Agrupa la carta por categoría, con «Sin categoría» al final. */
export function groupByCategory(dishes: Dish[]): { category: string; dishes: Dish[] }[] {
  const SIN = 'Sin categoría'
  const groups = new Map<string, Dish[]>()
  for (const d of dishes) {
    const key = d.category ?? SIN
    const list = groups.get(key) ?? []
    list.push(d)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .sort((a, b) => {
      if (a[0] === SIN) return 1
      if (b[0] === SIN) return -1
      return a[0].localeCompare(b[0], 'es')
    })
    .map(([category, list]) => ({ category, dishes: sortDishes(list) }))
}

export interface Suggestions {
  favourites: Dish[]
  untried: Dish[]
  avoid: Dish[]
}

/**
 * «¿Qué pido hoy?»: lo que te gustó, lo que te falta y lo que ya sabes que no.
 * Solo mira platos que sigan en la carta.
 */
export function suggest(dishes: Dish[], tastings: Tasting[]): Suggestions {
  const grouped = byDish(tastings)
  const scored = dishes
    .filter((d) => !d.archived)
    .map((d) => {
      const list = grouped.get(d.id) ?? []
      return { dish: d, avg: avgRating(list), count: list.length }
    })

  return {
    favourites: scored
      .filter((x) => x.avg !== null && x.avg >= 4)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0) || a.dish.name.localeCompare(b.dish.name, 'es'))
      .map((x) => x.dish),
    untried: scored
      .filter((x) => x.count === 0)
      .sort((a, b) => a.dish.name.localeCompare(b.dish.name, 'es'))
      .map((x) => x.dish),
    avoid: scored
      .filter((x) => x.avg !== null && x.avg <= 2)
      .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))
      .map((x) => x.dish),
  }
}

export interface TopDish {
  dish: Dish
  restaurantName: string
  avg: number
  count: number
}

export interface Stats {
  restaurants: number
  /** Platos en carta (sin contar los que ya no están). */
  dishes: number
  /** De esos, cuántos has probado. */
  tried: number
  /** % de carta probada en total (0–100, un decimal). */
  percent: number
  tastings: number
  /** Nota media de todo lo que has puntuado. null si no has puntuado nada. */
  avg: number | null
  /** Cartas completadas al 100%. */
  completed: number
  /** Gasto estimado: el precio del plato por cada vez que lo has comido. */
  spent: number
}

export function computeStats(restaurants: Restaurant[], dishes: Dish[], tastings: Tasting[]): Stats {
  const active = dishes.filter((d) => !d.archived)
  const triedIds = new Set(tastings.map((t) => t.dishId))
  const tried = active.filter((d) => triedIds.has(d.id)).length

  const completed = restaurants.filter((r) => {
    const own = dishes.filter((d) => d.restaurantId === r.id)
    return progressOf(
      own,
      tastings.filter((t) => t.restaurantId === r.id),
    ).complete
  }).length

  const priceById = new Map(dishes.map((d) => [d.id, d.price]))
  const spent = tastings.reduce((sum, t) => sum + (priceById.get(t.dishId) ?? 0), 0)

  return {
    restaurants: restaurants.length,
    dishes: active.length,
    tried,
    percent: active.length ? Math.round((tried / active.length) * 1000) / 10 : 0,
    tastings: tastings.length,
    avg: avgRating(tastings),
    completed,
    spent: Math.round(spent * 100) / 100,
  }
}

/** Los platos mejor valorados de todos los restaurantes. */
export function topDishes(
  restaurants: Restaurant[],
  dishes: Dish[],
  tastings: Tasting[],
  limit = 5,
): TopDish[] {
  const grouped = byDish(tastings)
  const nameById = new Map(restaurants.map((r) => [r.id, r.name]))
  return dishes
    .map((dish) => {
      const list = grouped.get(dish.id) ?? []
      return {
        dish,
        restaurantName: nameById.get(dish.restaurantId) ?? '',
        avg: avgRating(list) ?? 0,
        count: list.length,
      }
    })
    .filter((x) => x.avg > 0)
    .sort((a, b) => b.avg - a.avg || b.count - a.count || a.dish.name.localeCompare(b.dish.name, 'es'))
    .slice(0, limit)
}
