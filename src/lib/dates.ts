/**
 * Las degustaciones se guardan con la fecha en ISO corto (`YYYY-MM-DD`), sin
 * hora: importa el día que comiste algo, no el minuto. Al ser texto ordenable
 * también sirve tal cual para ordenar en SQL.
 */

/** Hoy en `YYYY-MM-DD`, en la zona horaria del móvil. */
export function todayISO(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DD` → `Date` a mediodía (así ningún cambio de zona mueve el día). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

/** `2026-08-27` → `27 ago 2026`. */
export function fmtDate(iso: string): string {
  if (!iso) return ''
  return isoToDate(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** `2026-08-27` → `27/08/2026`, para donde hace falta que ocupe poco. */
export function fmtDateShort(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
