/**
 * Verificación de que crear/migrar el esquema es idempotente.
 *
 * Con MIGRATIONS vacío (el esquema nace entero en v1) esto es fino de momento,
 * pero es la red de seguridad que hace falta tener puesta ANTES de que
 * MIGRATIONS tenga su primer paso real — igual que en Ludok Time y Ludok Been.
 *
 * Fichero de verificación, no forma parte de la app.
 */
import { createClient } from '@libsql/client'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { CREATE_SQL, MIGRATIONS, DB_VERSION } from '../src/lib/schemaSql'
import { check, eq, finish } from './helpers'

async function main() {
  const path = join(tmpdir(), `ludrest-migration-${process.pid}.db`)
  for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true })
  const client = createClient({ url: `file:${path}` })

  console.log('\n=== 1. Crear el esquema en una base nueva ===')
  await client.executeMultiple(CREATE_SQL)
  await client.execute(
    'INSERT INTO restaurants (id, name, city, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    ['r1', 'Bar Zaharra', 'Durango', 1700000000000, 1700000000000],
  )
  await client.execute(
    'INSERT INTO dishes (id, restaurantId, name, price, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['d1', 'r1', 'Pincho de tortilla', 2.5, 0, 1700000000000, 1700000000000],
  )
  await client.execute(
    'INSERT INTO tastings (id, dishId, restaurantId, date, rating, photo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['t1', 'd1', 'r1', '2026-06-01', 5, 'foto-0.jpg', 1700000000000],
  )
  eq('un restaurante insertado', (await client.execute('SELECT * FROM restaurants')).rows.length, 1)
  eq('una degustación insertada', (await client.execute('SELECT * FROM tastings')).rows.length, 1)

  console.log('\n=== 2. Re-ejecutar CREATE_SQL no destruye datos (IF NOT EXISTS) ===')
  await client.executeMultiple(CREATE_SQL)
  eq('el restaurante sigue ahí', (await client.execute('SELECT * FROM restaurants')).rows.length, 1)
  eq('y la degustación también', (await client.execute('SELECT * FROM tastings')).rows.length, 1)
  eq(
    'con su foto',
    (await client.execute('SELECT photo FROM tastings WHERE id = ?', ['t1'])).rows[0]?.photo,
    'foto-0.jpg',
  )

  console.log('\n=== 3. El precio guarda decimales de verdad ===')
  // Si la columna fuera INTEGER, 2.5 se convertiría en 2 en silencio.
  eq('2,50 sigue siendo 2,5', Number((await client.execute('SELECT price FROM dishes WHERE id = ?', ['d1'])).rows[0]?.price), 2.5)

  console.log('\n=== 4. DB_VERSION coincide con MIGRATIONS.length + 1 ===')
  eq('DB_VERSION', DB_VERSION, MIGRATIONS.length + 1)

  console.log('\n=== 5. user_version se puede fijar y volver a leer ===')
  await client.execute(`PRAGMA user_version = ${DB_VERSION}`)
  const uv = await client.execute('PRAGMA user_version')
  eq('user_version guardado', Number(uv.rows[0]?.user_version ?? -1), DB_VERSION)

  console.log('\n=== 6. Los índices existen (las listas se consultan por ellos) ===')
  const idx = await client.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%_idx'")
  const names = idx.rows.map((r) => String(r.name))
  for (const expected of ['dishes_restaurant_idx', 'tastings_dish_idx', 'tastings_restaurant_idx', 'tastings_date_idx']) {
    check(`índice ${expected}`, names.includes(expected))
  }

  for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true })
  finish('TODO CORRECTO — el esquema se crea de forma idempotente')
}

main().catch((e) => {
  console.error('\nEl test se rompió:', e)
  process.exit(1)
})
