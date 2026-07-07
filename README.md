# 🍴 Ludrest

Tu diario personal de restaurantes: apunta qué platos has probado en cada sitio,
ponles nota, foto y comentario — y no vuelvas a pedir a ciegas.

Es una **PWA** (web app instalable en el móvil) sin dependencias ni servidores:
todos los datos se guardan **en tu dispositivo** (IndexedDB).

## Probar en el ordenador

```bash
cd Ludrest
python3 -m http.server 8000
```

Abre <http://localhost:8000>. (Hace falta un servidor; abrir `index.html`
directamente con doble clic no funciona por el service worker.)

## Usarla en el móvil (recomendado)

La forma más fácil y gratis: **GitHub Pages**.

1. Crea un repo en GitHub y sube estos archivos.
2. En *Settings → Pages*, activa Pages desde la rama `main`.
3. Abre la URL en el móvil → menú del navegador → **«Añadir a pantalla de inicio»**.

Queda instalada como una app, con icono, y funciona sin conexión.
(La instalación como app requiere HTTPS, que GitHub Pages ya da.)

## Funciones

- Restaurantes con progreso de carta (¡complétala como un álbum de cromos!)
- Carta con categorías, precios y platos marcados como «ya no está»
- Cada vez que comes algo: fecha, nota de 1–5 ★, comentario y foto (comprimida automáticamente)
- Pestaña **«¿Qué pido hoy?»**: tus favoritos, lo que te falta por probar y lo que es mejor evitar
- Exportar / importar backup en JSON (fotos incluidas)

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | punto de entrada |
| `app.js` | interfaz y lógica (rutas por hash: inicio → restaurante → plato) |
| `db.js` | almacenamiento IndexedDB + export/import |
| `styles.css` | estilos (claro/oscuro automático) |
| `sw.js` | service worker (funciona offline) |
| `manifest.json`, `icon.svg` | instalación como app |

## Ideas futuras

- 📷→📋 OCR de cartas: foto a la carta y que la IA extraiga los platos (API de Claude)
- Etiquetas personales (`repetiría`, `para llevar a ama`…)
- Geolocalización: sugerir el restaurante al llegar
- Compartir valoraciones con amigos
