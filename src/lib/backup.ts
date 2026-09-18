// Capa nativa de las copias de seguridad: ficheros, compartir y selector.
// Toda la lógica de datos vive en `backupCore.ts`, que se prueba aparte.
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { db } from './db'
import { updateSettings } from './settings'
import { photoCodec, prunePhotos } from './photos'
import * as core from './backupCore'
import type { BackupFile } from '../types'

export type { ImportResult } from './backupCore'
export { daysSinceBackup } from './backupCore'

/** Copia completa: datos y fotos, todo dentro del mismo JSON. */
export function exportAll(): Promise<BackupFile> {
  return core.exportAll(db, photoCodec)
}

/**
 * Importa una copia y deja el almacén de fotos en su sitio.
 *
 * Al importar se reemplaza todo, así que las fotos que había en el móvil y no
 * vienen en la copia se quedan sin dueño; se barren aquí para que no se vayan
 * acumulando megas invisibles importación tras importación.
 */
export async function importAll(raw: string): Promise<core.ImportResult> {
  const result = await core.importAll(db, raw, photoCodec)
  prunePhotos(await core.referencedPhotos(db))
  return result
}

function backupFilename(date = new Date()): string {
  const pad = (x: number) => String(x).padStart(2, '0')
  return `ludok-taste-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** El JSON de la copia, listo para escribir. */
export async function backupJson(): Promise<string> {
  // Sin sangrado: con las fotos dentro, una copia son megas, y ponerle
  // espacios a un fichero que nadie lee a mano solo lo hace más gordo.
  return JSON.stringify(await exportAll())
}

/**
 * Escribe la copia y abre el menú de compartir para guardarla donde quieras
 * (Archivos, Nextcloud, Drive…).
 */
export async function shareBackup(): Promise<string> {
  const file = new File(Paths.cache, backupFilename())
  file.create({ overwrite: true })
  file.write(await backupJson())

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Copia de Ludok Taste',
      UTI: 'public.json',
    })
  }
  await updateSettings({ lastBackup: Date.now() })
  return file.uri
}

/** Abre el selector de ficheros y devuelve el contenido del JSON elegido. */
export async function pickJsonFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  })
  if (res.canceled || !res.assets?.[0]) return null
  return await new File(res.assets[0].uri).text()
}

export { backupFilename }
