/**
 * Andamiaje común de las verificaciones. No forma parte de la app.
 *
 * Se usa libsql y no better-sqlite3 porque este último es sincrónico y no
 * admite transacciones asíncronas, mientras que `expo-sqlite` (el del móvil)
 * sí: con libsql la semántica coincide con la real y se ejecuta el mismo código.
 */
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import * as schema from '../src/lib/schema'
import { CREATE_SQL } from '../src/lib/schemaSql'
import type { LudokDb, PhotoCodec } from '../src/lib/backupCore'

let failures = 0

export function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

export function eq<T>(label: string, actual: T, expected: T) {
  check(label, actual === expected, actual === expected ? '' : `esperado ${expected}, salió ${actual}`)
}

export async function rejects(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    check(`rechaza ${label}`, false, 'no lanzó error')
  } catch {
    check(`rechaza ${label}`, true)
  }
}

export function finish(message: string): never {
  console.log(failures === 0 ? `\n✅ ${message}\n` : `\n❌ ${failures} COMPROBACIONES FALLIDAS\n`)
  cleanupTempFiles()
  process.exit(failures === 0 ? 0 : 1)
}

// Fichero temporal en vez de ':memory:': una base en memoria NO se comparte
// entre conexiones, y las transacciones abren la suya, así que las tablas
// desaparecían dentro de la transacción. Con fichero se comporta como en el
// móvil, que también usa un fichero.
let dbSeq = 0
const tempFiles: string[] = []

export async function freshDb(tag = 'verify'): Promise<LudokDb> {
  const path = join(tmpdir(), `ludok-taste-${tag}-${process.pid}-${dbSeq++}.db`)
  rmSync(path, { force: true })
  tempFiles.push(path)
  const client = createClient({ url: `file:${path}` })
  await client.executeMultiple(CREATE_SQL)
  return drizzle(client, { schema }) as unknown as LudokDb
}

export function cleanupTempFiles() {
  for (const f of tempFiles) {
    for (const suffix of ['', '-wal', '-shm']) rmSync(f + suffix, { force: true })
  }
}

/**
 * Almacén de fotos en memoria: hace de `photos.ts` sin tocar el disco ni
 * expo-file-system. La lógica de copias que se ejecuta es exactamente la misma
 * que en el móvil; lo único distinto es dónde acaban los bytes.
 */
export function memoryPhotos(): { codec: PhotoCodec; files: Map<string, string> } {
  const files = new Map<string, string>()
  let seq = 0
  return {
    files,
    codec: {
      toDataUrl: async (name) => files.get(name),
      fromDataUrl: async (dataUrl) => {
        const name = `foto-${seq++}.jpg`
        files.set(name, dataUrl)
        return name
      },
    },
  }
}

/** Una imagen diminuta pero real, para que las pruebas muevan bytes de verdad. */
export const SAMPLE_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
