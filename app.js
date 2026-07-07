/* Ludrest — app */
'use strict';

const $app = document.getElementById('app');
const $modalRoot = document.getElementById('modal-root');
let _objectURLs = [];

/* ---------- utilidades ---------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function freeObjectURLs() {
  _objectURLs.forEach(u => URL.revokeObjectURL(u));
  _objectURLs = [];
}

function photoURL(blob) {
  const u = URL.createObjectURL(blob);
  _objectURLs.push(u);
  return u;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function stars(n) {
  if (!n) return '';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function avgRating(tastings) {
  const rated = tastings.filter(t => t.rating);
  if (!rated.length) return null;
  return rated.reduce((a, t) => a + t.rating, 0) / rated.length;
}

/* Comprime una imagen a JPEG máx. 1280px para no llenar el almacenamiento */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1280;
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        const k = MAX / Math.max(w, h);
        w = Math.round(w * k); h = Math.round(h * k);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen')),
        'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen no válida')); };
    img.src = url;
  });
}

/* ---------- modal ---------- */

function openModal(html) {
  $modalRoot.innerHTML =
    `<div class="modal-backdrop" data-close="1"><div class="modal">${html}</div></div>`;
  $modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
    if (e.target.dataset.close) closeModal();
  });
}

function closeModal() { $modalRoot.innerHTML = ''; }

/* ---------- selector de estrellas en formularios ---------- */

function starPickerHTML(value = 0) {
  let btns = '';
  for (let i = 1; i <= 5; i++) {
    btns += `<button type="button" class="star-btn${i <= value ? ' on' : ''}" data-star="${i}">★</button>`;
  }
  return `<div class="star-picker" data-value="${value}">${btns}
    <button type="button" class="star-clear" title="Sin nota">✕</button></div>`;
}

function wireStarPicker(root) {
  const picker = root.querySelector('.star-picker');
  if (!picker) return;
  picker.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    let v = b.classList.contains('star-clear') ? 0 : Number(b.dataset.star);
    if (v && v === Number(picker.dataset.value)) v = 0; // tocar la misma estrella la quita
    picker.dataset.value = v;
    picker.querySelectorAll('.star-btn').forEach((el, i) =>
      el.classList.toggle('on', i < v));
  });
}

/* ---------- rutas ---------- */

async function render() {
  freeObjectURLs();
  closeModal();
  const hash = location.hash || '#/';
  const [, view, id] = hash.split('/');
  try {
    if (view === 'r' && id) await renderRestaurant(id);
    else if (view === 'd' && id) await renderDish(id);
    else await renderHome();
  } catch (err) {
    $app.innerHTML = `<div class="empty">Error: ${esc(err.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

/* ================= PANTALLA: INICIO ================= */

async function renderHome() {
  const [restaurants, dishes, tastings] = await Promise.all([
    dbGetAll('restaurants'), dbGetAll('dishes'), dbGetAll('tastings'),
  ]);
  restaurants.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const triedDishIds = new Set(tastings.map(t => t.dishId));

  let cards = restaurants.map(r => {
    const rDishes = dishes.filter(d => d.restaurantId === r.id && !d.archived);
    const tried = rDishes.filter(d => triedDishIds.has(d.id)).length;
    const total = rDishes.length;
    const pct = total ? Math.round(tried / total * 100) : 0;
    return `
      <a class="card rest-card" href="#/r/${r.id}">
        <div class="rest-card-main">
          <div class="rest-name">${esc(r.name)}</div>
          ${r.city ? `<div class="rest-city">📍 ${esc(r.city)}</div>` : ''}
        </div>
        <div class="rest-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-label">${tried}/${total} probados${total && tried === total ? ' 🏆' : ''}</div>
        </div>
      </a>`;
  }).join('');

  if (!restaurants.length) {
    cards = `<div class="empty">
      <div class="empty-icon">🍽️</div>
      <p>Todavía no hay restaurantes.</p>
      <p class="hint">Añade tu pizzería de Bilbao o ese bar de Durango con tantos pinchos de tortilla…</p>
    </div>`;
  }

  $app.innerHTML = `
    <header class="topbar">
      <h1 class="logo">🍴 Ludrest</h1>
    </header>
    <main class="content">
      ${cards}
      <button class="fab" id="add-rest">＋ Restaurante</button>
      <div class="footer-actions">
        <button class="link-btn" id="export-btn">⬇ Exportar backup</button>
        <button class="link-btn" id="import-btn">⬆ Importar backup</button>
        <input type="file" id="import-file" accept="application/json" hidden>
      </div>
    </main>`;

  document.getElementById('add-rest').onclick = () => restaurantForm();
  document.getElementById('export-btn').onclick = doExport;
  const fileInput = document.getElementById('import-file');
  document.getElementById('import-btn').onclick = () => fileInput.click();
  fileInput.onchange = () => doImport(fileInput.files[0]);
}

async function doExport() {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ludrest-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function doImport(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await importAllData(data);
    alert('Backup importado correctamente.');
    render();
  } catch (err) {
    alert('No se pudo importar: ' + err.message);
  }
}

function restaurantForm(existing) {
  openModal(`
    <h2>${existing ? 'Editar' : 'Nuevo'} restaurante</h2>
    <form id="rest-form">
      <label>Nombre *<input name="name" required maxlength="80" value="${esc(existing?.name || '')}" placeholder="Pizzería Da Luken"></label>
      <label>Ciudad / zona<input name="city" maxlength="80" value="${esc(existing?.city || '')}" placeholder="Bilbao"></label>
      <label>Notas<textarea name="notes" rows="2" placeholder="Cierran los lunes…">${esc(existing?.notes || '')}</textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn secondary" data-close="1" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">Guardar</button>
      </div>
    </form>`);
  document.getElementById('rest-form').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const r = existing || { id: newId(), createdAt: new Date().toISOString() };
    r.name = f.get('name').trim();
    r.city = f.get('city').trim();
    r.notes = f.get('notes').trim();
    await dbPut('restaurants', r);
    closeModal();
    if (!existing) location.hash = `#/r/${r.id}`; else render();
  };
}

/* ================= PANTALLA: RESTAURANTE ================= */

let _activeTab = 'carta'; // se conserva al re-renderizar dentro del mismo restaurante
let _activeTabRest = null;

async function renderRestaurant(id) {
  const rest = await dbGet('restaurants', id);
  if (!rest) { location.hash = '#/'; return; }
  const [dishes, tastings] = await Promise.all([
    dbGetByIndex('dishes', 'restaurantId', id),
    dbGetByIndex('tastings', 'restaurantId', id),
  ]);
  if (_activeTabRest !== id) { _activeTab = 'carta'; _activeTabRest = id; }

  const byDish = {};
  tastings.forEach(t => (byDish[t.dishId] = byDish[t.dishId] || []).push(t));

  const activeDishes = dishes.filter(d => !d.archived);
  const tried = activeDishes.filter(d => byDish[d.id]?.length).length;

  $app.innerHTML = `
    <header class="topbar">
      <a class="back" href="#/">‹</a>
      <div class="topbar-title">
        <h1>${esc(rest.name)}</h1>
        ${rest.city ? `<span class="subtitle">📍 ${esc(rest.city)}</span>` : ''}
      </div>
      <button class="icon-btn" id="rest-menu">⋯</button>
    </header>
    ${rest.notes ? `<p class="rest-notes">${esc(rest.notes)}</p>` : ''}
    <div class="tabs">
      <button class="tab${_activeTab === 'carta' ? ' on' : ''}" data-tab="carta">Carta <span class="badge">${tried}/${activeDishes.length}</span></button>
      <button class="tab${_activeTab === 'pedir' ? ' on' : ''}" data-tab="pedir">¿Qué pido hoy?</button>
    </div>
    <main class="content" id="tab-content"></main>
    <button class="fab" id="add-dish">＋ Plato</button>`;

  const tabContent = document.getElementById('tab-content');
  const paint = () => {
    tabContent.innerHTML = _activeTab === 'carta'
      ? cartaHTML(dishes, byDish)
      : pedirHTML(dishes, byDish);
    wireDishList(tabContent, dishes, byDish, rest);
  };
  paint();

  $app.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    _activeTab = t.dataset.tab;
    $app.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    paint();
  });

  document.getElementById('add-dish').onclick = () => dishForm(rest, dishes);
  document.getElementById('rest-menu').onclick = () => {
    openModal(`
      <h2>${esc(rest.name)}</h2>
      <div class="menu-list">
        <button class="btn secondary" id="m-edit">✏️ Editar restaurante</button>
        <button class="btn danger" id="m-del">🗑 Borrar restaurante</button>
      </div>`);
    document.getElementById('m-edit').onclick = () => { closeModal(); restaurantForm(rest); };
    document.getElementById('m-del').onclick = async () => {
      if (confirm(`¿Borrar "${rest.name}" con todos sus platos, fotos y notas? No se puede deshacer.`)) {
        await deleteRestaurantDeep(rest.id);
        location.hash = '#/';
      }
    };
  };
}

function groupByCategory(dishes) {
  const groups = new Map();
  for (const d of dishes) {
    const cat = d.category?.trim() || 'Sin categoría';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(d);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.archived - b.archived) || a.name.localeCompare(b.name, 'es'));
  }
  return groups;
}

function dishRowHTML(d, tastings) {
  const n = tastings.length;
  const avg = avgRating(tastings);
  const last = n ? tastings.reduce((a, b) => a.date > b.date ? a : b) : null;
  return `
    <div class="dish-row${d.archived ? ' archived' : ''}" data-dish="${d.id}">
      <button class="check${n ? ' done' : ''}" data-quick="${d.id}" title="${n ? 'Probado' : 'Marcar como probado'}">${n ? '✓' : ''}</button>
      <a class="dish-main" href="#/d/${d.id}">
        <div class="dish-name">${esc(d.name)}${d.archived ? ' <span class="chip">ya no está</span>' : ''}</div>
        <div class="dish-meta">
          ${avg ? `<span class="rating">${stars(Math.round(avg))}</span>` : ''}
          ${n ? `<span>${n}×${last ? ' · ' + fmtDate(last.date) : ''}</span>` : ''}
          ${d.price ? `<span>${esc(d.price)} €</span>` : ''}
        </div>
      </a>
    </div>`;
}

function cartaHTML(dishes, byDish) {
  if (!dishes.length) {
    return `<div class="empty">
      <div class="empty-icon">📋</div>
      <p>La carta está vacía.</p>
      <p class="hint">Añade los platos con el botón «＋ Plato». Puedes ponerles categoría (pizzas, pinchos, postres…).</p>
    </div>`;
  }
  let html = '';
  for (const [cat, list] of groupByCategory(dishes)) {
    html += `<h3 class="cat-title">${esc(cat)}</h3>`;
    html += list.map(d => dishRowHTML(d, byDish[d.id] || [])).join('');
  }
  return html;
}

function pedirHTML(dishes, byDish) {
  const active = dishes.filter(d => !d.archived);
  const withAvg = active.map(d => ({ d, avg: avgRating(byDish[d.id] || []), n: (byDish[d.id] || []).length }));

  const favs = withAvg.filter(x => x.avg >= 4).sort((a, b) => b.avg - a.avg);
  const untried = withAvg.filter(x => !x.n);
  const avoid = withAvg.filter(x => x.avg !== null && x.avg <= 2).sort((a, b) => a.avg - b.avg);

  const section = (title, items, emptyMsg) => `
    <h3 class="cat-title">${title}</h3>
    ${items.length ? items.map(x => dishRowHTML(x.d, byDish[x.d.id] || [])).join('')
      : `<p class="hint section-hint">${emptyMsg}</p>`}`;

  if (!active.length) {
    return `<div class="empty"><div class="empty-icon">🤔</div><p>Añade platos a la carta primero.</p></div>`;
  }
  return section('⭐ Tus favoritos', favs, 'Aún no hay platos con 4★ o más. ¡A comer!')
    + section('🆕 Sin probar', untried, '¡Lo has probado todo! 🏆')
    + (avoid.length ? section('👎 Mejor evita', avoid, '') : '');
}

function wireDishList(root, dishes, byDish, rest) {
  root.querySelectorAll('[data-quick]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      const dish = dishes.find(d => d.id === btn.dataset.quick);
      tastingForm(dish, () => render());
    };
  });
}

function dishForm(rest, allDishes, existing) {
  const cats = [...new Set(allDishes.map(d => d.category?.trim()).filter(Boolean))];
  openModal(`
    <h2>${existing ? 'Editar' : 'Nuevo'} plato</h2>
    <form id="dish-form">
      <label>Nombre *<input name="name" required maxlength="120" value="${esc(existing?.name || '')}" placeholder="Pincho de tortilla con cebolla"></label>
      <label>Categoría<input name="category" maxlength="60" list="cat-list" value="${esc(existing?.category || '')}" placeholder="Pinchos">
        <datalist id="cat-list">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <label>Precio (€)<input name="price" inputmode="decimal" maxlength="10" value="${esc(existing?.price || '')}" placeholder="2.50"></label>
      <label>Descripción<textarea name="description" rows="2" placeholder="Con pan, poco hecha…">${esc(existing?.description || '')}</textarea></label>
      ${existing ? `<label class="check-label"><input type="checkbox" name="archived" ${existing.archived ? 'checked' : ''}> Ya no está en la carta</label>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">Guardar</button>
      </div>
    </form>`);
  document.getElementById('dish-form').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const d = existing || { id: newId(), restaurantId: rest.id, createdAt: new Date().toISOString() };
    d.name = f.get('name').trim();
    d.category = f.get('category').trim();
    d.price = f.get('price').trim();
    d.description = f.get('description').trim();
    if (existing) d.archived = !!f.get('archived');
    await dbPut('dishes', d);
    closeModal();
    render();
  };
}

/* ================= PANTALLA: PLATO ================= */

async function renderDish(id) {
  const dish = await dbGet('dishes', id);
  if (!dish) { location.hash = '#/'; return; }
  const [rest, tastings] = await Promise.all([
    dbGet('restaurants', dish.restaurantId),
    dbGetByIndex('tastings', 'dishId', id),
  ]);
  tastings.sort((a, b) => b.date.localeCompare(a.date));
  const avg = avgRating(tastings);

  const tastingCards = tastings.map(t => `
    <div class="card tasting-card" data-tasting="${t.id}">
      ${t.photo ? `<img class="tasting-photo" src="${photoURL(t.photo)}" alt="Foto" loading="lazy">` : ''}
      <div class="tasting-body">
        <div class="tasting-head">
          <span class="tasting-date">${fmtDate(t.date)}</span>
          ${t.rating ? `<span class="rating">${stars(t.rating)}</span>` : '<span class="hint">sin nota</span>'}
          <button class="icon-btn small" data-del-tasting="${t.id}" title="Borrar">🗑</button>
        </div>
        ${t.note ? `<p class="tasting-note">${esc(t.note)}</p>` : ''}
      </div>
    </div>`).join('');

  $app.innerHTML = `
    <header class="topbar">
      <a class="back" href="#/r/${dish.restaurantId}">‹</a>
      <div class="topbar-title">
        <h1>${esc(dish.name)}</h1>
        <span class="subtitle">${esc(rest?.name || '')}${dish.category ? ' · ' + esc(dish.category) : ''}</span>
      </div>
      <button class="icon-btn" id="dish-menu">⋯</button>
    </header>
    <main class="content">
      <div class="dish-summary card">
        ${dish.archived ? '<span class="chip">ya no está en la carta</span>' : ''}
        ${dish.description ? `<p>${esc(dish.description)}</p>` : ''}
        <div class="dish-meta">
          ${dish.price ? `<span>${esc(dish.price)} €</span>` : ''}
          ${avg ? `<span class="rating">${stars(Math.round(avg))} (${avg.toFixed(1)})</span>` : ''}
          <span>${tastings.length ? `probado ${tastings.length} ${tastings.length === 1 ? 'vez' : 'veces'}` : 'sin probar todavía'}</span>
        </div>
      </div>
      <button class="btn primary big" id="add-tasting">🍽 He comido esto</button>
      ${tastingCards || '<p class="hint section-hint">Cuando lo pruebes, apunta aquí qué te pareció y sube una foto.</p>'}
    </main>`;

  document.getElementById('add-tasting').onclick = () => tastingForm(dish, () => render());

  document.getElementById('dish-menu').onclick = () => {
    openModal(`
      <h2>${esc(dish.name)}</h2>
      <div class="menu-list">
        <button class="btn secondary" id="m-edit">✏️ Editar plato</button>
        <button class="btn danger" id="m-del">🗑 Borrar plato</button>
      </div>`);
    document.getElementById('m-edit').onclick = async () => {
      closeModal();
      const all = await dbGetByIndex('dishes', 'restaurantId', dish.restaurantId);
      dishForm(rest, all, dish);
    };
    document.getElementById('m-del').onclick = async () => {
      if (confirm(`¿Borrar "${dish.name}" con su historial y fotos?`)) {
        await deleteDishDeep(dish.id);
        location.hash = `#/r/${dish.restaurantId}`;
      }
    };
  };

  $app.querySelectorAll('[data-del-tasting]').forEach(b => b.onclick = async () => {
    if (confirm('¿Borrar esta degustación?')) {
      await dbDelete('tastings', b.dataset.delTasting);
      render();
    }
  });

  /* foto a pantalla completa */
  $app.querySelectorAll('.tasting-photo').forEach(img => img.onclick = () => {
    openModal(`<img class="fullphoto" src="${img.src}" alt="Foto">`);
  });
}

/* ---------- formulario de degustación ---------- */

function tastingForm(dish, onSaved) {
  let photoBlob = null;
  openModal(`
    <h2>${esc(dish.name)}</h2>
    <form id="tasting-form">
      <label>Fecha<input type="date" name="date" value="${todayISO()}" required max="${todayISO()}"></label>
      <label>Tu nota${starPickerHTML(0)}</label>
      <label>Comentario<textarea name="note" rows="3" placeholder="Jugosa, poco hecha por dentro. Repetir."></textarea></label>
      <label class="photo-label">
        <span class="btn secondary">📷 Añadir foto</span>
        <input type="file" name="photo" accept="image/*" capture="environment" hidden>
      </label>
      <img id="photo-preview" class="photo-preview" hidden alt="Vista previa">
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">Guardar</button>
      </div>
    </form>`);

  const form = document.getElementById('tasting-form');
  wireStarPicker(form);

  const fileInput = form.querySelector('input[type=file]');
  const preview = document.getElementById('photo-preview');
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      photoBlob = await compressImage(file);
      preview.src = URL.createObjectURL(photoBlob);
      preview.hidden = false;
    } catch (err) {
      alert(err.message);
    }
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const rating = Number(form.querySelector('.star-picker').dataset.value) || null;
    const t = {
      id: newId(),
      dishId: dish.id,
      restaurantId: dish.restaurantId,
      date: f.get('date'),
      rating,
      note: f.get('note').trim(),
      createdAt: new Date().toISOString(),
    };
    if (photoBlob) t.photo = photoBlob;
    await dbPut('tastings', t);
    closeModal();
    onSaved();
  };
}

/* ---------- arranque ---------- */
render();
