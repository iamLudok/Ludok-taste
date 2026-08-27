// Modelo de datos de Ludrest.
//
// Todo vive en local (SQLite privado de la app). Tres niveles: un restaurante
// tiene una carta de platos, y cada vez que comes uno se apunta una
// degustación con su nota, su comentario y su foto.

export interface Restaurant {
  id: string
  name: string
  /** Ciudad o zona. Ausente = no se apuntó. */
  city?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Dish {
  id: string
  restaurantId: string
  name: string
  /** Sección de la carta ('Pinchos', 'Postres'…). Ausente = «Sin categoría». */
  category?: string
  /** Precio en euros. Ausente = no se apuntó (no es lo mismo que 0). */
  price?: number
  description?: string
  /** Ya no está en la carta: sigue contando en el historial, pero no en el progreso. */
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Tasting {
  id: string
  dishId: string
  /** Se guarda también aquí (además de en el plato) para poder listar por restaurante sin cruzar tablas. */
  restaurantId: string
  /** Fecha en ISO corto, `YYYY-MM-DD`. Sin hora: lo que importa es el día. */
  date: string
  /** Nota de 1 a 5. Ausente = comido pero sin puntuar. */
  rating?: number
  note?: string
  /**
   * Nombre del fichero de la foto dentro de la carpeta de fotos de la app.
   * En las copias de seguridad este mismo campo viaja como `data:` URL con la
   * imagen dentro; ver `backupCore.ts`.
   */
  photo?: string
  createdAt: number
}

export interface Settings {
  id: 'app'
  theme: 'dark' | 'light' | 'system'
  lastBackup: number
  schemaVersion: number
  /** Copia automática a un Nextcloud propio (opcional). */
  nextcloudUrl?: string
  nextcloudUser?: string
  /** Contraseña de aplicación de Nextcloud. Nunca se incluye en las copias exportadas. */
  nextcloudPassword?: string
  nextcloudFolder?: string
  autoBackup?: boolean
  lastAutoBackupAt?: number
}

/**
 * Estructura del fichero de copia de seguridad.
 *
 * Es igual que el modelo de la app salvo en las fotos: en el disco `photo` es
 * un nombre de fichero, y aquí es la imagen entera como `data:` URL, para que
 * una copia sea un único fichero que se pueda mandar a cualquier sitio.
 */
export interface BackupFile {
  app: 'ludrest'
  schemaVersion: number
  exportedAt: number
  restaurants: Restaurant[]
  dishes: Dish[]
  tastings: Tasting[]
  settings: Settings | null
}
