// Definición de tablas para Drizzle. Solo describe las columnas: las tablas y
// los índices se crean con SQL explícito en `db.ts` (migraciones por
// PRAGMA user_version), igual que la web usaba versiones de IndexedDB.
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const restaurants = sqliteTable('restaurants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city'),
  notes: text('notes'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
})

export const dishes = sqliteTable('dishes', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurantId').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  price: real('price'),
  description: text('description'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
})

export const tastings = sqliteTable('tastings', {
  id: text('id').primaryKey(),
  dishId: text('dishId').notNull(),
  restaurantId: text('restaurantId').notNull(),
  date: text('date').notNull(),
  rating: integer('rating'),
  note: text('note'),
  photo: text('photo'),
  createdAt: integer('createdAt').notNull(),
})

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  theme: text('theme').$type<'dark' | 'light' | 'system'>().notNull().default('system'),
  lastBackup: integer('lastBackup').notNull().default(0),
  schemaVersion: integer('schemaVersion').notNull(),
  nextcloudUrl: text('nextcloudUrl'),
  nextcloudUser: text('nextcloudUser'),
  nextcloudPassword: text('nextcloudPassword'),
  nextcloudFolder: text('nextcloudFolder'),
  autoBackup: integer('autoBackup', { mode: 'boolean' }),
  lastAutoBackupAt: integer('lastAutoBackupAt'),
})

export type RestaurantRow = typeof restaurants.$inferSelect
export type DishRow = typeof dishes.$inferSelect
export type TastingRow = typeof tastings.$inferSelect
export type SettingsRow = typeof settings.$inferSelect
