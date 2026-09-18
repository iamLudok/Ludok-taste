// Núcleo de las copias de seguridad: solo consultas Drizzle, sin nada nativo.
//
// Está separado de `backup.ts` a propósito. Aquí no se importa expo-file-system
// ni expo-sqlite, así que este código se puede ejecutar tal cual en Node contra
// un SQLite de escritorio para probarlo. Como recibe la base de datos (y el
// almacén de fotos) por parámetro, el test ejecuta EXACTAMENTE el mismo código
// que corre en el móvil.
import { eq } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import {
  restaurants as restaurantsTable,
  dishes as dishesTable,
  tastings as tastingsTable,
  settings as settingsTable,
} from './schema'
import { rowToRestaurant, rowToDish, rowToTasting, rowToSettings, settingsToRow, restaurantToRow, dishToRow, tastingToRow } from './rows'
import { isLegacyBackup, convertLegacy } from './legacy'
import { chunk } from './sqlHelpers'
import { SCHEMA_VERSION, APP_ID } from './version'
import type { BackupFile, Dish, Restaurant, Settings, Tasting } from '../types'

export { SCHEMA_VERSION, APP_ID }

/** Cualquier base de datos SQLite de Drizzle (expo-sqlite en el móvil, libsql en los tests). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LudokDb = BaseSQLiteDatabase<any, any, any>

/**
 * Traductor entre las fotos del disco y las de la copia.
 *
 * En la base de datos `tasting.photo` es un nombre de fichero; en el JSON es la
 * imagen entera como `data:` URL. Se pasa desde fuera para que este módulo no
 * sepa nada de ficheros: en el móvil lo implementa `photos.ts` y en los tests,
 * un almacén en memoria.
 */
export interface PhotoCodec {
  /** Nombre de fichero → `data:` URL. undefined si la foto ya no está en el disco. */
  toDataUrl(name: string): Promise<string | undefined>
  /** `data:` URL → nombre del fichero guardado. undefined si no se pudo guardar. */
  fromDataUrl(dataUrl: string): Promise<string | undefined>
}

/** Almacén de fotos que no guarda nada. Para exportar «solo los datos». */
export const NO_PHOTOS: PhotoCodec = {
  toDataUrl: async () => undefined,
  fromDataUrl: async () => undefined,
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  theme: 'system',
  lastBackup: 0,
  schemaVersion: SCHEMA_VERSION,
  autoBackup: false,
}

export async function readSettings(database: LudokDb): Promise<Settings> {
  const rows = await database
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.id, 'app'))
    .limit(1)
  return rows[0] ? rowToSettings(rows[0]) : DEFAULT_SETTINGS
}

export async function writeSettings(database: LudokDb, next: Settings): Promise<void> {
  const row = settingsToRow(next)
  await database.insert(settingsTable).values(row).onConflictDoUpdate({ target: settingsTable.id, set: row })
}

/**
 * Serializa toda la base de datos a un objeto de copia, con las fotos dentro.
 *
 * Que las fotos viajen en el propio JSON es lo que hace que una copia sea UN
 * fichero: se manda por donde sea y se restaura en otro móvil sin que falte
 * nada. El precio es el tamaño (unos 200 KB por foto).
 */
export async function exportAll(database: LudokDb, photos: PhotoCodec): Promise<BackupFile> {
  const restaurantRows = await database.select().from(restaurantsTable)
  const dishRows = await database.select().from(dishesTable)
  const tastingRows = await database.select().from(tastingsTable)
  const settings = await readSettings(database)

  const withPhotos: Tasting[] = []
  for (const row of tastingRows) {
    const tasting = rowToTasting(row)
    if (tasting.photo) {
      // Si el fichero ya no está, la degustación se exporta sin foto en vez de
      // llevarse un nombre que al restaurar no apuntaría a nada.
      tasting.photo = await photos.toDataUrl(tasting.photo)
    }
    withPhotos.push(tasting)
  }

  // La contraseña de Nextcloud NO se exporta. Una copia se comparte y se mueve
  // de sitio, y esa contraseña da permiso de ESCRITURA sobre tus ficheros; la
  // propia copia acaba subida ahí, así que además viajaría con su propia llave
  // dentro. Al restaurar en otro móvil hay que volver a escribirla, y punto.
  const { nextcloudPassword: _omitted, ...safeSettings } = settings

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    restaurants: restaurantRows.map(rowToRestaurant),
    dishes: dishRows.map(rowToDish),
    tastings: withPhotos,
    settings: safeSettings,
  }
}

export interface ImportResult {
  restaurants: number
  dishes: number
  tastings: number
  photos: number
  /** true si la copia venía de la PWA. */
  legacy: boolean
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('El fichero no es un JSON válido.')
  }
}

function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d.app === APP_ID && typeof d.schemaVersion === 'number' && Array.isArray(d.restaurants)
}

/**
 * Importa una copia, reemplazando el contenido actual. Valida el formato y el
 * schemaVersion antes de tocar nada.
 *
 * Las fotos se escriben al disco ANTES de abrir la transacción: escribir
 * ficheros no se puede deshacer con un ROLLBACK, así que si algo fallara a
 * mitad quedarían ficheros sueltos con filas a medias apuntándolos. Haciéndolo
 * en este orden, lo peor que puede pasar es que sobren ficheros, y de esos ya
 * se encarga la limpieza de huérfanas.
 */
export async function importAll(
  database: LudokDb,
  raw: string,
  photos: PhotoCodec,
): Promise<ImportResult> {
  // `const` y no `let`: TypeScript solo estrecha el tipo a través de un
  // booleano guardado (`legacy`) si la variable comprobada es constante.
  const parsed = parseJson(raw)

  const legacy = isLegacyBackup(parsed)
  const backup = legacy ? convertLegacy(parsed) : parsed

  if (!isBackupFile(backup)) {
    throw new Error('Este fichero no es una copia de Ludok Taste.')
  }
  if (backup.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `La copia es de una versión más nueva (v${backup.schemaVersion}). Actualiza la app antes de importar.`,
    )
  }

  const restaurants: Restaurant[] = backup.restaurants ?? []
  const dishes: Dish[] = backup.dishes ?? []
  const incoming: Tasting[] = backup.tastings ?? []

  let savedPhotos = 0
  const tastings: Tasting[] = []
  for (const tasting of incoming) {
    const copy = { ...tasting }
    if (copy.photo?.startsWith('data:')) {
      copy.photo = await photos.fromDataUrl(copy.photo)
      if (copy.photo) savedPhotos++
    }
    tastings.push(copy)
  }

  await database.transaction(async (tx: LudokDb) => {
    await tx.delete(tastingsTable)
    await tx.delete(dishesTable)
    await tx.delete(restaurantsTable)

    for (const part of chunk(restaurants)) {
      await tx.insert(restaurantsTable).values(part.map(restaurantToRow))
    }
    for (const part of chunk(dishes)) {
      await tx.insert(dishesTable).values(part.map(dishToRow))
    }
    for (const part of chunk(tastings)) {
      await tx.insert(tastingsTable).values(part.map(tastingToRow))
    }

    if (backup.settings) {
      // La contraseña de Nextcloud no viene en la copia (no se exporta), así
      // que se mantiene la que ya hubiera en este móvil.
      const current = await readSettings(tx)
      await writeSettings(tx, {
        ...current,
        ...backup.settings,
        nextcloudPassword: current.nextcloudPassword,
        id: 'app',
        schemaVersion: SCHEMA_VERSION,
      })
    }
  })

  return {
    restaurants: restaurants.length,
    dishes: dishes.length,
    tastings: tastings.length,
    photos: savedPhotos,
    legacy,
  }
}

/** Nombres de fichero de todas las fotos referenciadas ahora mismo. */
export async function referencedPhotos(database: LudokDb): Promise<Set<string>> {
  const rows = await database.select().from(tastingsTable)
  const names = new Set<string>()
  for (const row of rows) if (row.photo) names.add(row.photo)
  return names
}

/** Días transcurridos desde la última copia. null si nunca se hizo. */
export function daysSinceBackup(lastBackup: number): number | null {
  if (!lastBackup) return null
  return Math.floor((Date.now() - lastBackup) / 86_400_000)
}
