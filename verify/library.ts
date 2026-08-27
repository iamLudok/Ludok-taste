/**
 * Verificación de las reglas: progreso de la carta, «¿qué pido hoy?»,
 * estadísticas y borrados en cascada.
 *
 * Es el mismo `library.ts` que usa la app: las funciones de cálculo son puras y
 * las de escritura hablan con la base a través de `dbRef`, así que aquí se
 * ejecutan tal cual contra un SQLite de escritorio.
 *
 * Fichero de verificación, no forma parte de la app.
 */
import { setDb } from '../src/lib/dbRef'
import {
  saveRestaurant,
  saveDish,
  addTasting,
  deleteDishDeep,
  deleteRestaurantDeep,
  deleteTasting,
  avgRating,
  progressOf,
  groupByCategory,
  suggest,
  summarize,
  computeStats,
  topDishes,
} from '../src/lib/library'
import { parsePrice, trimmed } from '../src/lib/rows'
import { todayISO } from '../src/lib/dates'
import { exportAll } from '../src/lib/backupCore'
import { check, eq, finish, freshDb, memoryPhotos } from './helpers'
import type { Dish, Tasting } from '../src/types'

const dish = (id: string, extra: Partial<Dish> = {}): Dish => ({
  id,
  restaurantId: 'r1',
  name: id,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})

const tasting = (dishId: string, rating?: number, date = '2026-01-01'): Tasting => ({
  id: `${dishId}-${date}-${rating ?? 'x'}`,
  dishId,
  restaurantId: 'r1',
  date,
  rating,
  createdAt: 0,
})

async function main() {
  console.log('\n=== 1. Nota media ===')
  eq('sin degustaciones no hay media', avgRating([]), null)
  eq('comido sin puntuar tampoco cuenta', avgRating([tasting('a'), tasting('a')]), null)
  eq('media de 5 y 3', avgRating([tasting('a', 5), tasting('a', 3)]), 4)
  check(
    'las comidas sin nota no bajan la media',
    avgRating([tasting('a', 4), tasting('a')]) === 4,
  )

  console.log('\n=== 2. Progreso de la carta ===')
  const carta = [dish('d1'), dish('d2'), dish('d3')]
  eq('carta vacía es 0%', progressOf([], []).percent, 0)
  eq('carta vacía no está completa', progressOf([], []).complete, false)
  eq('uno de tres', progressOf(carta, [tasting('d1', 4)]).percent, 33)
  eq('probarlo dos veces sigue siendo uno de tres', progressOf(carta, [tasting('d1', 4), tasting('d1', 5)]).tried, 1)
  const conRetirado = [dish('d1'), dish('d2'), dish('d3', { archived: true })]
  eq(
    'lo que ya no está en la carta no cuenta para el total',
    progressOf(conRetirado, [tasting('d1'), tasting('d2')]).complete,
    true,
  )

  console.log('\n=== 3. Agrupar por categoría ===')
  const grupos = groupByCategory([
    dish('b', { category: 'Postres', name: 'Tarta' }),
    dish('a', { category: 'Pizzas', name: 'Margarita' }),
    dish('c', { name: 'Pan' }),
    dish('d', { category: 'Pizzas', name: 'Cuatro quesos', archived: true }),
  ])
  eq('tres grupos', grupos.length, 3)
  eq('ordenados alfabéticamente', grupos[0]?.category, 'Pizzas')
  eq('«Sin categoría» va al final', grupos[2]?.category, 'Sin categoría')
  eq('dentro del grupo, lo pedible primero', grupos[0]?.dishes[0]?.name, 'Margarita')

  console.log('\n=== 4. ¿Qué pido hoy? ===')
  const tips = suggest(
    [dish('bueno'), dish('malo'), dish('nuevo'), dish('regular'), dish('retirado', { archived: true })],
    [
      tasting('bueno', 5),
      tasting('bueno', 4),
      tasting('malo', 1),
      tasting('regular', 3),
      tasting('retirado', 5),
    ],
  )
  eq('un favorito', tips.favourites.length, 1)
  eq('y es el bueno', tips.favourites[0]?.id, 'bueno')
  eq('un plato sin probar', tips.untried.length, 1)
  eq('y es el nuevo', tips.untried[0]?.id, 'nuevo')
  eq('uno a evitar', tips.avoid.length, 1)
  eq('y es el malo', tips.avoid[0]?.id, 'malo')
  check('un 3 no es ni favorito ni a evitar', !tips.favourites.includes(dish('regular')) && tips.avoid.every((d) => d.id !== 'regular'))
  check('lo retirado no se recomienda aunque estuviera buenísimo', tips.favourites.every((d) => d.id !== 'retirado'))

  console.log('\n=== 5. Resumen de un plato ===')
  const resumen = summarize([tasting('d', 4, '2026-01-01'), tasting('d', 2, '2026-06-30'), tasting('d', 5, '2026-03-05')])
  eq('veces', resumen.count, 3)
  eq('la última es la más reciente', resumen.last, '2026-06-30')

  console.log('\n=== 6. Escribir y borrar en cascada ===')
  const db = await freshDb('library')
  setDb(db)
  const photos = memoryPhotos()

  const r1 = await saveRestaurant({ name: 'Bar Zaharra', city: 'Durango' })
  const d1 = await saveDish({ restaurantId: r1, name: 'Pincho de tortilla', price: 2.5 })
  const d2 = await saveDish({ restaurantId: r1, name: 'Gilda' })
  const foto1 = (await photos.codec.fromDataUrl('data:image/jpeg;base64,AAAA'))!
  const foto2 = (await photos.codec.fromDataUrl('data:image/jpeg;base64,BBBB'))!
  const t1 = await addTasting({ dishId: d1, restaurantId: r1, date: todayISO(), rating: 5, photo: foto1 })
  await addTasting({ dishId: d2, restaurantId: r1, date: todayISO(), rating: 3, photo: foto2 })

  const antes = await exportAll(db, photos.codec)
  eq('dos platos guardados', antes.dishes.length, 2)
  eq('dos degustaciones guardadas', antes.tastings.length, 2)

  console.log('\n--- editar no duplica ---')
  await saveDish({ id: d1, restaurantId: r1, name: 'Pincho de tortilla con cebolla', price: 2.8 })
  const editado = await exportAll(db, photos.codec)
  eq('sigue habiendo dos platos', editado.dishes.length, 2)
  eq('con el nombre nuevo', editado.dishes.find((d) => d.id === d1)?.name, 'Pincho de tortilla con cebolla')
  check(
    'y sin perder su historial',
    editado.tastings.filter((t) => t.dishId === d1).length === 1,
  )

  console.log('\n--- borrar una degustación devuelve su foto ---')
  const huerfanas1 = await deleteTasting(t1)
  eq('una foto huérfana', huerfanas1.length, 1)
  eq('y es la suya', huerfanas1[0], foto1)

  console.log('\n--- borrar un plato se lleva su historial ---')
  const huerfanas2 = await deleteDishDeep(d2)
  eq('la foto de la degustación borrada', huerfanas2.length, 1)
  eq('y es la del otro plato', huerfanas2[0], foto2)
  const trasBorrar = await exportAll(db, photos.codec)
  eq('queda un plato', trasBorrar.dishes.length, 1)
  eq('y ninguna degustación', trasBorrar.tastings.length, 0)

  console.log('\n--- borrar el restaurante lo deja todo limpio ---')
  await addTasting({ dishId: d1, restaurantId: r1, date: todayISO(), rating: 4 })
  await deleteRestaurantDeep(r1)
  const vacio = await exportAll(db, photos.codec)
  eq('sin restaurantes', vacio.restaurants.length, 0)
  eq('sin platos', vacio.dishes.length, 0)
  eq('sin degustaciones', vacio.tastings.length, 0)

  console.log('\n=== 7. Estadísticas ===')
  const stats = computeStats(
    [
      { id: 'r1', name: 'Uno', createdAt: 0, updatedAt: 0 },
      { id: 'r2', name: 'Dos', createdAt: 0, updatedAt: 0 },
    ],
    [
      dish('d1', { price: 10 }),
      dish('d2', { price: 5 }),
      dish('d3', { restaurantId: 'r2', price: 3 }),
      dish('d4', { restaurantId: 'r2', archived: true }),
    ],
    [
      tasting('d1', 5),
      tasting('d1', 3, '2026-02-02'),
      { ...tasting('d3', 4), restaurantId: 'r2' },
    ],
  )
  eq('restaurantes', stats.restaurants, 2)
  eq('platos en carta (sin los retirados)', stats.dishes, 3)
  eq('probados', stats.tried, 2)
  eq('porcentaje', stats.percent, 66.7)
  eq('veces apuntadas', stats.tastings, 3)
  eq('nota media', stats.avg, 4)
  eq('una carta completa (la de r2, ignorando el retirado)', stats.completed, 1)
  eq('gasto estimado: 10 + 10 + 3', stats.spent, 23)

  const top = topDishes(
    [{ id: 'r1', name: 'Uno', createdAt: 0, updatedAt: 0 }],
    [dish('d1'), dish('d2')],
    [tasting('d1', 5), tasting('d2', 2)],
    5,
  )
  eq('el mejor primero', top[0]?.dish.id, 'd1')
  eq('con el nombre de su restaurante', top[0]?.restaurantName, 'Uno')

  console.log('\n=== 8. Lo que se escribe a mano ===')
  eq('precio con coma', parsePrice('2,50'), 2.5)
  eq('precio con punto', parsePrice('2.50'), 2.5)
  eq('precio vacío no es 0', parsePrice('   '), undefined)
  eq('precio ilegible no se inventa', parsePrice('carísimo'), undefined)
  eq('un negativo no se acepta', parsePrice('-3'), undefined)
  eq('texto en blanco no se guarda', trimmed('   '), undefined)
  eq('texto con espacios se recorta', trimmed('  Bilbao '), 'Bilbao')
  eq('hoy en ISO corto', todayISO(new Date(2026, 7, 27)), '2026-08-27')

  finish('TODO CORRECTO — las reglas de la app se comportan')
}

main().catch((e) => {
  console.error('\nEl test se rompió:', e)
  process.exit(1)
})
