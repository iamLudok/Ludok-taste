/**
 * Verificación de la capa de datos: la ida y vuelta de las copias.
 *
 * Ejecuta el MISMO `backupCore` que corre en el móvil, pero contra un SQLite de
 * escritorio y un almacén de fotos en memoria. Comprueba que nada se pierde por
 * el camino, ni siquiera las fotos, y que una copia de la PWA sigue entrando.
 *
 * Fichero de verificación, no forma parte de la app.
 */
import { setDb } from '../src/lib/dbRef'
import { saveRestaurant, saveDish, addTasting } from '../src/lib/library'
import { exportAll, importAll, readSettings, writeSettings, referencedPhotos } from '../src/lib/backupCore'
import { check, eq, rejects, finish, freshDb, memoryPhotos, SAMPLE_PHOTO } from './helpers'
import type { BackupFile } from '../src/types'

/** Un diario pequeño pero completo: con fotos, sin fotos, con huecos. */
async function seed() {
  const db = await freshDb('data')
  setDb(db)
  const photos = memoryPhotos()

  const bilbao = await saveRestaurant({ name: 'Pizzería Da Luken', city: 'Bilbao', notes: 'Cierran los lunes' })
  const durango = await saveRestaurant({ name: 'Bar Zaharra' }) // sin ciudad ni notas

  const margarita = await saveDish({ restaurantId: bilbao, name: 'Margarita', category: 'Pizzas', price: 9.5 })
  const cuatro = await saveDish({ restaurantId: bilbao, name: 'Cuatro quesos', category: 'Pizzas', price: 11 })
  const tiramisu = await saveDish({ restaurantId: bilbao, name: 'Tiramisú', category: 'Postres' })
  const tortilla = await saveDish({ restaurantId: durango, name: 'Pincho de tortilla', price: 2.5 })
  const gilda = await saveDish({ restaurantId: durango, name: 'Gilda', archived: true })

  // Una degustación con foto: es el caso que la web guardaba como Blob.
  const foto = await photos.codec.fromDataUrl(SAMPLE_PHOTO)
  await addTasting({ dishId: margarita, restaurantId: bilbao, date: '2026-03-14', rating: 5, note: 'Brutal', photo: foto })
  await addTasting({ dishId: margarita, restaurantId: bilbao, date: '2026-05-02', rating: 4 })
  // Comida pero sin puntuar: un hueco legítimo, no un 0.
  await addTasting({ dishId: tortilla, restaurantId: durango, date: '2026-06-01' })
  await addTasting({ dishId: gilda, restaurantId: durango, date: '2026-06-01', rating: 2, note: 'Muy salada' })

  return { db, photos, ids: { bilbao, durango, margarita, cuatro, tiramisu, tortilla, gilda } }
}

async function main() {
  console.log('\n=== 1. Exportar lo que hay ===')
  const { db, photos } = await seed()
  const out = await exportAll(db, photos.codec)
  eq('restaurantes', out.restaurants.length, 2)
  eq('platos', out.dishes.length, 5)
  eq('degustaciones', out.tastings.length, 4)
  eq('versión del formato', out.schemaVersion, 2)

  console.log('\n=== 2. Las fotos viajan dentro del JSON ===')
  const conFoto = out.tastings.find((t) => t.photo)
  check('hay una degustación con foto', !!conFoto)
  check('la foto es una data: URL, no un nombre de fichero', !!conFoto?.photo?.startsWith('data:image/jpeg;base64,'))
  eq('y son los bytes de la original', conFoto?.photo, SAMPLE_PHOTO)

  console.log('\n=== 3. Los huecos siguen siendo huecos ===')
  const sinCiudad = out.restaurants.find((r) => r.name === 'Bar Zaharra')!
  check('un restaurante sin ciudad no exporta la clave', !('city' in JSON.parse(JSON.stringify(sinCiudad))))
  const sinNota = out.tastings.find((t) => t.date === '2026-06-01' && !t.rating)
  check('una comida sin puntuar no exporta rating (no es un 0)', !!sinNota && sinNota.rating === undefined)
  const sinPrecio = out.dishes.find((d) => d.name === 'Tiramisú')!
  check('un plato sin precio no exporta precio', !('price' in JSON.parse(JSON.stringify(sinPrecio))))

  console.log('\n=== 4. Restaurar en un móvil limpio deja lo mismo ===')
  const otro = await freshDb('data')
  const otrasFotos = memoryPhotos()
  const res = await importAll(otro, JSON.stringify(out), otrasFotos.codec)
  eq('restaurantes importados', res.restaurants, 2)
  eq('platos importados', res.dishes, 5)
  eq('degustaciones importadas', res.tastings, 4)
  eq('fotos guardadas en el disco nuevo', res.photos, 1)
  eq('no era una copia de la web', res.legacy, false)

  const back = await exportAll(otro, otrasFotos.codec)
  const same = JSON.stringify(sorted(out)) === JSON.stringify(sorted(back))
  check('la copia de la copia es idéntica', same)
  eq('el plato archivado sigue archivado', back.dishes.find((d) => d.name === 'Gilda')?.archived, true)
  eq('la foto sobrevivió al viaje', back.tastings.find((t) => t.photo)?.photo, SAMPLE_PHOTO)

  console.log('\n=== 5. Importar reemplaza, no acumula ===')
  await importAll(otro, JSON.stringify({ ...out, restaurants: [out.restaurants[0]], dishes: [], tastings: [] }), otrasFotos.codec)
  const after = await exportAll(otro, otrasFotos.codec)
  eq('solo queda lo de la última copia', after.restaurants.length, 1)
  eq('y sin platos', after.dishes.length, 0)
  eq('ninguna foto queda referenciada', (await referencedPhotos(otro)).size, 0)

  console.log('\n=== 6. Una copia de la PWA sigue entrando ===')
  // Formato exacto que exportaba la versión web: `version`, fechas en texto ISO,
  // precios como cadena y fotos en data: URL.
  const pwa = {
    app: 'ludrest',
    version: 1,
    exportedAt: '2026-07-12T18:30:00.000Z',
    restaurants: [
      { id: 'r1', name: 'Pizzería Da Luken', city: 'Bilbao', notes: '', createdAt: '2026-01-02T10:00:00.000Z' },
    ],
    dishes: [
      { id: 'd1', restaurantId: 'r1', name: 'Margarita', category: 'Pizzas', price: '9,50', description: '', createdAt: '2026-01-02T10:05:00.000Z' },
      { id: 'd2', restaurantId: 'r1', name: 'Gilda', category: '', price: '', description: '', archived: true, createdAt: '2026-01-02T10:06:00.000Z' },
    ],
    tastings: [
      { id: 't1', dishId: 'd1', restaurantId: 'r1', date: '2026-03-14', rating: 5, note: 'Brutal', photo: SAMPLE_PHOTO, createdAt: '2026-03-14T21:00:00.000Z' },
      { id: 't2', dishId: 'd1', restaurantId: 'r1', date: '2026-05-02', rating: null, note: '', createdAt: '2026-05-02T21:00:00.000Z' },
    ],
  }
  const web = await freshDb('data')
  const webPhotos = memoryPhotos()
  const legacyRes = await importAll(web, JSON.stringify(pwa), webPhotos.codec)
  eq('detecta que viene de la web', legacyRes.legacy, true)
  eq('restaurantes', legacyRes.restaurants, 1)
  eq('platos', legacyRes.dishes, 2)
  eq('degustaciones', legacyRes.tastings, 2)
  eq('fotos rescatadas', legacyRes.photos, 1)

  const webOut = await exportAll(web, webPhotos.codec)
  eq('el precio en texto se lee como número', webOut.dishes.find((d) => d.id === 'd1')?.price, 9.5)
  check('las cadenas vacías no se guardan como campos vacíos', webOut.restaurants[0]?.notes === undefined)
  eq('la fecha de creación pasa a milisegundos', webOut.restaurants[0]?.createdAt, Date.parse('2026-01-02T10:00:00.000Z'))
  eq('«ya no está» se conserva', webOut.dishes.find((d) => d.id === 'd2')?.archived, true)
  eq('rating null se queda sin nota, no en 0', webOut.tastings.find((t) => t.id === 't2')?.rating, undefined)
  eq('la foto de la web se conserva', webOut.tastings.find((t) => t.id === 't1')?.photo, SAMPLE_PHOTO)

  console.log('\n=== 7. Volumen: un diario de muchos años ===')
  const big = await freshDb('data')
  const bigPhotos = memoryPhotos()
  const bulk: BackupFile = {
    app: 'ludrest',
    schemaVersion: 2,
    exportedAt: Date.now(),
    restaurants: Array.from({ length: 40 }, (_, i) => ({
      id: `r${i}`, name: `Restaurante ${i}`, createdAt: 1700000000000 + i, updatedAt: 1700000000000 + i,
    })),
    dishes: Array.from({ length: 600 }, (_, i) => ({
      id: `d${i}`, restaurantId: `r${i % 40}`, name: `Plato ${i}`, archived: false,
      createdAt: 1700000000000 + i, updatedAt: 1700000000000 + i,
    })),
    tastings: Array.from({ length: 1500 }, (_, i) => ({
      id: `t${i}`, dishId: `d${i % 600}`, restaurantId: `r${i % 40}`,
      date: '2026-01-01', rating: (i % 5) + 1, createdAt: 1700000000000 + i,
    })),
    settings: null,
  }
  const t0 = Date.now()
  const bigRes = await importAll(big, JSON.stringify(bulk), bigPhotos.codec)
  const ms = Date.now() - t0
  eq('1500 degustaciones importadas', bigRes.tastings, 1500)
  eq('y se leen de vuelta', (await exportAll(big, bigPhotos.codec)).tastings.length, 1500)
  console.log(`        (${ms} ms)`)

  console.log('\n=== 8. Rechaza lo que no debe aceptar ===')
  await rejects('un JSON inválido', async () => importAll(await freshDb('data'), '{no es json', photos.codec))
  await rejects('un JSON que no es de Ludrest', async () =>
    importAll(await freshDb('data'), JSON.stringify({ app: 'otra-cosa', restaurants: [] }), photos.codec),
  )
  await rejects('una copia de una versión más nueva', async () =>
    importAll(await freshDb('data'), JSON.stringify({ ...out, schemaVersion: 99 }), photos.codec),
  )

  console.log('\n=== 9. La contraseña de Nextcloud NO sale en las copias ===')
  // Una copia se comparte y puede acabar subida al propio servidor: si llevara
  // dentro la contraseña que da permiso de escritura allí, sería regalar la
  // llave junto con la copia.
  await writeSettings(db, {
    ...(await readSettings(db)),
    nextcloudUrl: 'https://cloud.example.com',
    nextcloudUser: 'luken',
    nextcloudPassword: 'SECRETO-QUE-NO-DEBE-SALIR',
  })
  const exported = await exportAll(db, photos.codec)
  check('el texto de la copia no contiene la contraseña', !JSON.stringify(exported).includes('SECRETO-QUE-NO-DEBE-SALIR'))
  eq('ni el campo existe', exported.settings?.nextcloudPassword, undefined)
  eq('la dirección sí se guarda (no es secreta)', exported.settings?.nextcloudUrl, 'https://cloud.example.com')

  const mio = await freshDb('data')
  await writeSettings(mio, { ...(await readSettings(mio)), nextcloudPassword: 'LA-MIA' })
  await importAll(mio, JSON.stringify(exported), memoryPhotos().codec)
  eq('no borra la contraseña ya guardada en este móvil', (await readSettings(mio)).nextcloudPassword, 'LA-MIA')

  finish('TODO CORRECTO — los datos y las fotos entran y salen sin perder nada')
}

/** Normaliza para poder comparar dos copias como texto (el orden de las filas no importa). */
function sorted(backup: BackupFile): unknown {
  const plain = JSON.parse(JSON.stringify(backup)) as BackupFile
  const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id)
  return {
    restaurants: [...plain.restaurants].sort(byId),
    dishes: [...plain.dishes].sort(byId),
    tastings: [...plain.tastings].sort(byId),
  }
}

main().catch((e) => {
  console.error('\nEl test se rompió:', e)
  process.exit(1)
})
