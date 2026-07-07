/* Ludrest — capa de datos (IndexedDB) */
'use strict';

const DB_NAME = 'ludrest';
const DB_VERSION = 1;
let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('dishes')) {
        const s = db.createObjectStore('dishes', { keyPath: 'id' });
        s.createIndex('restaurantId', 'restaurantId');
      }
      if (!db.objectStoreNames.contains('tastings')) {
        const s = db.createObjectStore('tastings', { keyPath: 'id' });
        s.createIndex('dishId', 'dishId');
        s.createIndex('restaurantId', 'restaurantId');
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function _tx(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const result = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(result.result !== undefined ? result.result : result._value);
    tx.onerror = () => reject(tx.error);
  }));
}

const dbPut = (store, value) => _tx(store, 'readwrite', s => s.put(value));
const dbDelete = (store, key) => _tx(store, 'readwrite', s => s.delete(key));
const dbGet = (store, key) => _tx(store, 'readonly', s => s.get(key));
const dbGetAll = (store) => _tx(store, 'readonly', s => s.getAll());
const dbGetByIndex = (store, index, value) =>
  _tx(store, 'readonly', s => s.index(index).getAll(value));

function newId() {
  return (crypto.randomUUID) ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* Borra un plato y todas sus degustaciones */
async function deleteDishDeep(dishId) {
  const tastings = await dbGetByIndex('tastings', 'dishId', dishId);
  for (const t of tastings) await dbDelete('tastings', t.id);
  await dbDelete('dishes', dishId);
}

/* Borra un restaurante con sus platos y degustaciones */
async function deleteRestaurantDeep(restaurantId) {
  const dishes = await dbGetByIndex('dishes', 'restaurantId', restaurantId);
  for (const d of dishes) await deleteDishDeep(d.id);
  await dbDelete('restaurants', restaurantId);
}

/* ---------- Export / Import ---------- */

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

async function exportAllData() {
  const [restaurants, dishes, tastings] = await Promise.all([
    dbGetAll('restaurants'), dbGetAll('dishes'), dbGetAll('tastings'),
  ]);
  const tastingsOut = [];
  for (const t of tastings) {
    const copy = { ...t };
    if (copy.photo instanceof Blob) copy.photo = await blobToDataURL(copy.photo);
    tastingsOut.push(copy);
  }
  return {
    app: 'ludrest', version: 1, exportedAt: new Date().toISOString(),
    restaurants, dishes, tastings: tastingsOut,
  };
}

async function importAllData(data) {
  if (!data || data.app !== 'ludrest' || !Array.isArray(data.restaurants)) {
    throw new Error('El archivo no parece un backup de Ludrest.');
  }
  for (const r of data.restaurants) await dbPut('restaurants', r);
  for (const d of data.dishes || []) await dbPut('dishes', d);
  for (const t of data.tastings || []) {
    const copy = { ...t };
    if (typeof copy.photo === 'string' && copy.photo.startsWith('data:')) {
      copy.photo = await dataURLToBlob(copy.photo);
    }
    await dbPut('tastings', copy);
  }
}
