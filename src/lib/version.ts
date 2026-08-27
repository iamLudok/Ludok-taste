/**
 * Versión del formato de datos (esquema local Y copias de seguridad).
 *
 * La 1 fue la de la PWA (`{app:'ludrest', version:1}`, fechas en texto ISO y
 * precios como cadena). Esas copias se siguen pudiendo importar: ver
 * `legacy.ts`. La 2 es la de esta app.
 */
export const SCHEMA_VERSION = 2
