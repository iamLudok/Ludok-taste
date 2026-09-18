/**
 * Versión del formato de datos (esquema local Y copias de seguridad).
 *
 * La 1 fue la de la PWA Ludrest (`{app:'ludrest', version:1}`, fechas en texto ISO
 * y precios como cadena). Esas copias se siguen pudiendo importar: ver
 * `legacy.ts`. La 2 es de cuando pasó a ser app nativa — sigue valiendo ahora
 * que la app se llama Ludok Taste: el formato no cambió, solo el nombre.
 */
export const SCHEMA_VERSION = 2

/**
 * Identificador del formato de copia de ESTA app (la nativa). El de la PWA
 * era `'ludrest'` a secas; `legacy.ts` lo comprueba por su cuenta porque ese
 * es un hecho histórico que no cambia aunque la app se vuelva a renombrar.
 *
 * Vive aquí y no en `backupCore.ts` para que `legacy.ts` lo pueda importar sin
 * crear un ciclo (`backupCore.ts` importa de `legacy.ts`, no al revés).
 */
export const APP_ID = 'ludok-taste'
