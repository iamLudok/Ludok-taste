// Las fotos de los platos: hacerlas, encogerlas, guardarlas y borrarlas.
//
// En la base de datos solo se guarda el NOMBRE del fichero, no la ruta entera:
// la carpeta de la app cambia de sitio entre instalaciones, y una ruta absoluta
// guardada apuntaría a la nada al restaurar una copia en otro móvil.
//
// Este módulo sí es nativo (ficheros y cámara). La lógica que tiene que poder
// probarse en el escritorio no lo importa: habla con él a través de `PhotoCodec`.
import { Directory, File, Paths } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { newId } from './ids'
import type { PhotoCodec } from './backupCore'

/** Lado mayor máximo, en píxeles. El mismo que usaba la PWA. */
const MAX_SIDE = 1280
/** Calidad JPEG. 0.82 es donde deja de notarse la diferencia y el fichero ya no crece. */
const QUALITY = 0.82

const FOLDER = 'fotos'

/** La carpeta de fotos, creada si aún no existe. */
function photoDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER)
  if (!dir.exists) dir.create({ intermediates: true })
  return dir
}

/** Ruta `file://` de una foto, para pasársela a `<Image>`. */
export function photoUri(name: string): string {
  return new File(photoDir(), name).uri
}

/**
 * Encoge la imagen si hace falta, la pasa a JPEG y la guarda en la carpeta de
 * la app. Devuelve el nombre del fichero.
 *
 * Solo se encoge lo que se pasa de grande: `resize` con un tamaño fijo también
 * AGRANDA, y estirar la foto de una carta sacada de lejos solo haría el fichero
 * más gordo sin añadir un solo detalle.
 */
export async function savePhoto(source: {
  uri: string
  width?: number
  height?: number
}): Promise<string> {
  const context = ImageManipulator.manipulate(source.uri)
  const { width = 0, height = 0 } = source
  if (width > MAX_SIDE || height > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE })
  }

  const rendered = await context.renderAsync()
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY })

  // `saveAsync` deja el resultado en la caché, que el sistema puede vaciar
  // cuando le apetezca: hay que moverlo a la carpeta de datos de la app.
  const name = `${newId()}.jpg`
  await new File(saved.uri).move(new File(photoDir(), name))
  return name
}

/** Hace una foto con la cámara y la guarda. null si se cancela. */
export async function takePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Sin permiso para usar la cámara. Se puede dar desde los ajustes del móvil.')
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
  if (result.canceled || !result.assets[0]) return null
  return savePhoto(result.assets[0])
}

/** Elige una foto de la galería y la guarda. null si se cancela. */
export async function choosePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 })
  if (result.canceled || !result.assets[0]) return null
  return savePhoto(result.assets[0])
}

/** Borra fotos por nombre. Las que ya no estén se ignoran sin ruido. */
export function deletePhotos(names: string[]): void {
  for (const name of names) {
    try {
      const file = new File(photoDir(), name)
      if (file.exists) file.delete()
    } catch {
      // Una foto que no se puede borrar es basura ocupando sitio, no un error
      // que deba cortar un borrado que por lo demás ya se ha hecho.
    }
  }
}

/**
 * Borra las fotos que ya no menciona ninguna degustación. Se llama después de
 * importar una copia: al reemplazarse todos los datos, las fotos del móvil que
 * no vinieran en la copia se quedan sin dueño.
 */
export function prunePhotos(keep: Set<string>): number {
  let removed = 0
  for (const entry of photoDir().list()) {
    if (entry instanceof File && !keep.has(entry.name)) {
      try {
        entry.delete()
        removed++
      } catch {
        // Ídem: si una no se deja borrar, seguimos con las demás.
      }
    }
  }
  return removed
}

/** La implementación real de `PhotoCodec`: la que usa la app en el móvil. */
export const photoCodec: PhotoCodec = {
  async toDataUrl(name: string): Promise<string | undefined> {
    const file = new File(photoDir(), name)
    if (!file.exists) return undefined
    return `data:image/jpeg;base64,${await file.base64()}`
  },

  async fromDataUrl(dataUrl: string): Promise<string | undefined> {
    const comma = dataUrl.indexOf(',')
    if (comma < 0) return undefined
    const name = `${newId()}.jpg`
    const file = new File(photoDir(), name)
    file.create({ overwrite: true })
    file.write(dataUrl.slice(comma + 1), { encoding: 'base64' })
    return name
  },
}
