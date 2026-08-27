/**
 * Trocea los inserts: SQLite limita el número de variables por sentencia, y una
 * copia con años de historial puede traer miles de degustaciones de golpe.
 */
export function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
