import { useMemo } from 'react'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { db } from '../lib/db'
import {
  restaurants as restaurantsTable,
  dishes as dishesTable,
  tastings as tastingsTable,
} from '../lib/schema'
import { rowToRestaurant, rowToDish, rowToTasting } from '../lib/rows'
import type { Dish, Restaurant, Tasting } from '../types'

/**
 * Consultas en vivo: cualquier cambio en la base repinta las pantallas solo.
 *
 * Se traen las tablas enteras y se filtra en memoria. Puede sonar a manta, pero
 * son tres tablas de un diario personal — cientos de filas, no millones — y las
 * fotos no van dentro (en la fila solo está el nombre del fichero). A cambio,
 * la pantalla de un restaurante y la de un plato comparten exactamente los
 * mismos datos y no hay dos consultas que puedan contarte cosas distintas.
 */

export function useRestaurants(): { data: Restaurant[]; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(restaurantsTable))
  const rows = useMemo(() => (data ?? []).map(rowToRestaurant), [data])
  return { data: rows, ready: updatedAt !== undefined }
}

export function useDishes(): { data: Dish[]; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(dishesTable))
  const rows = useMemo(() => (data ?? []).map(rowToDish), [data])
  return { data: rows, ready: updatedAt !== undefined }
}

export function useTastings(): { data: Tasting[]; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(tastingsTable))
  const rows = useMemo(() => (data ?? []).map(rowToTasting), [data])
  return { data: rows, ready: updatedAt !== undefined }
}

/** Todo a la vez, para las pantallas que cruzan las tres tablas. */
export function useLibrary(): {
  restaurants: Restaurant[]
  dishes: Dish[]
  tastings: Tasting[]
  ready: boolean
} {
  const restaurants = useRestaurants()
  const dishes = useDishes()
  const tastings = useTastings()
  return {
    restaurants: restaurants.data,
    dishes: dishes.data,
    tastings: tastings.data,
    ready: restaurants.ready && dishes.ready && tastings.ready,
  }
}
