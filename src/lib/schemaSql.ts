export const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  notes TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY NOT NULL,
  restaurantId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  price REAL,
  description TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tastings (
  id TEXT PRIMARY KEY NOT NULL,
  dishId TEXT NOT NULL,
  restaurantId TEXT NOT NULL,
  date TEXT NOT NULL,
  rating INTEGER,
  note TEXT,
  photo TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system',
  lastBackup INTEGER NOT NULL DEFAULT 0,
  schemaVersion INTEGER NOT NULL,
  nextcloudUrl TEXT,
  nextcloudUser TEXT,
  nextcloudPassword TEXT,
  nextcloudFolder TEXT,
  autoBackup INTEGER,
  lastAutoBackupAt INTEGER
);

CREATE INDEX IF NOT EXISTS dishes_restaurant_idx ON dishes (restaurantId);
CREATE INDEX IF NOT EXISTS tastings_dish_idx ON tastings (dishId);
CREATE INDEX IF NOT EXISTS tastings_restaurant_idx ON tastings (restaurantId);
CREATE INDEX IF NOT EXISTS tastings_date_idx ON tastings (date);
`

/**
 * Un paso por cada versión desde la 1. `MIGRATIONS[0]` llevaría de v1 a v2, etc.
 * Van con `ADD COLUMN` porque CREATE_SQL ya describe el esquema final para
 * instalaciones nuevas: esto es solo para poner al día las que ya existían.
 *
 * Está vacío a propósito: esta app nace con el esquema entero. Antes de ser una
 * app nativa (y de llamarse Ludok Taste) esto fue la PWA Ludrest, que guardaba
 * en IndexedDB y no en SQLite, así que no hay ninguna instalación anterior que
 * migrar — esas copias entran por el importador.
 */
export const MIGRATIONS: string[] = []

export const DB_VERSION = MIGRATIONS.length + 1
