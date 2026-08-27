# Ludrest

Diario de restaurantes: qué platos has probado en cada sitio, con nota, comentario y foto,
para no volver a pedir a ciegas. **Los datos son míos** y viven en mi móvil.

React Native con Expo SDK 57, igual que [Ludok Time](../Ludok%20time) y [Ludok Been](../Ludok%20been).

## Lo que manda: no perder datos nunca

Todo lo demás va después.

- Los datos viven en `/data/data/com.ludok.rest/`. No hay cuentas ni servidores.
- Copia de seguridad en JSON, exportable e importable en cualquier momento, **con las fotos dentro**.
- **Copia automática a un Nextcloud propio** al abrir la app estando en WiFi, un fichero por día.
- Aviso en la pantalla de inicio cuando llevas mucho sin copia.
- La capa de datos **se prueba de verdad**, no solo con tipos (ver más abajo).

## Qué se registra

| Nivel | Qué guarda |
|---|---|
| Restaurante | Nombre, ciudad, notas y el progreso de su carta |
| Plato | Categoría, precio, descripción y si sigue o no en la carta |
| Cada vez que lo comes | Fecha, nota de 1–5 ★, comentario y foto (encogida a 1280 px) |

Pestaña **«¿Qué pido hoy?»** dentro de cada restaurante: tus favoritos (4★ o más), lo que te falta
por probar y lo que ya sabes que mejor evitas.

## Arranque

```bash
npm install
npm run android      # instala y abre en un móvil conectado por adb
npm run typecheck    # tipos de la app y de los scripts de verificación
npm run verify       # comprueba la capa de datos
```

Hace falta JDK 17, Android SDK con API 36 y `adb`.

> Gradle pide un toolchain de **Java 17**. Si falla con «Cannot find a Java installation matching
> languageVersion=17» teniendo un JDK más nuevo, apunta al que Gradle ya se descargó:
>
> ```bash
> export JAVA_HOME=~/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2
> ```

## Compilar un APK

```bash
npm run build:apk                    # todas las arquitecturas
./scripts/build-apk.sh --compartir   # solo arm64-v8a, para repartir
# → android/app/build/outputs/apk/release/app-release.apk
```

Tiene que ser **release**, no debug: en debug el JavaScript no va dentro del APK, se carga del
servidor de Metro, así que un APK de debug no funciona sin el ordenador delante.

Instalar: `adb install -r app-release.apk`. Con `-r` se instala **encima** conservando los datos,
siempre que la firma sea la misma.

### ⚠️ El keystore hay que guardarlo como oro

La firma vive en `release.jks` + `keystore.properties`, los dos fuera del repo (en `.gitignore`).

Android solo deja instalar un APK **encima** de otro si van firmados con la misma clave. Si se
pierden, la única salida es **desinstalar** para poner la versión nueva — y desinstalar **borra los
datos de la app**.

Guárdalos junto a las copias de seguridad. Es lo único de este proyecto que no se puede regenerar.

## Las fotos

Cada foto se encoge a 1280 px de lado mayor y se guarda como JPEG (calidad 0.82) en la carpeta de
datos de la app. En la base de datos solo se guarda el **nombre del fichero**, nunca la ruta
completa: la carpeta cambia de sitio entre instalaciones y una ruta absoluta guardada apuntaría a
la nada al restaurar una copia en otro móvil.

En las copias de seguridad ese mismo campo viaja como `data:` URL con la imagen dentro, para que
una copia sea **un solo fichero** que se puede mandar a donde sea. El precio es el tamaño: unos
200 KB por foto.

Al importar se reemplaza todo, así que las fotos del móvil que no vengan en la copia se quedan sin
dueño; se barren solas ([`prunePhotos`](src/lib/photos.ts)) para que no se acumulen megas
invisibles importación tras importación.

## Copia automática a Nextcloud

En **Ajustes → Copia automática a Nextcloud**: dirección, usuario, contraseña y carpeta. Al abrir la
app estando en WiFi sube sola, como mucho una vez cada 12 horas, con un fichero por día.

Solo por WiFi, y aquí no es un capricho heredado: la copia lleva las fotos dentro, así que puede ser
de decenas de megas.

Usa una **contraseña de aplicación** de Nextcloud (Ajustes personales → Seguridad), no la de la
cuenta: se revoca sola sin tocar nada más.

Esa contraseña **no se incluye en las copias exportadas**, a propósito: una copia se comparte y se
mueve de sitio, y esa contraseña da permiso de escritura sobre tus ficheros — la copia acabaría
viajando con su propia llave dentro. Hay una prueba en `verify:data` que lo comprueba.

No se usa una tarea en segundo plano a propósito: Android las mata sin avisar y encima no se vería
si funcionan. Como la app se abre en la mesa para apuntar lo que has pedido, en la práctica la copia
acaba siendo frecuente igual.

## Verificación de la capa de datos

Los datos son la parte que no puede fallar, así que se prueban ejecutando **el mismo código que
corre en el móvil** contra un SQLite de escritorio:

```bash
npm run verify:data       # formato de copia: ida y vuelta, fotos, huecos, volumen, rechazos
npm run verify:library    # reglas: progreso, «¿qué pido hoy?», estadísticas, borrados
npm run verify:migration  # que el esquema se crea de forma idempotente
```

Esto es posible porque la lógica pide la base de datos a [`src/lib/dbRef.ts`](src/lib/dbRef.ts) en
vez de crearla ella: [`src/lib/db.ts`](src/lib/db.ts) es el **único** fichero que toca
`expo-sqlite`. Con las fotos se hace lo mismo: [`backupCore.ts`](src/lib/backupCore.ts) recibe un
`PhotoCodec` en vez de importar `expo-file-system`, y las pruebas le pasan uno en memoria.

Se usa **libsql** y no `better-sqlite3` porque este último es sincrónico y no admite transacciones
asíncronas, mientras que `expo-sqlite` sí: con libsql la semántica coincide con la real.

## Estructura

```
app/                     # rutas (expo-router)
  (tabs)/                # Restaurantes, Stats, Ajustes
  restaurante/[id]       # carta y «¿qué pido hoy?»
  plato/[id]             # historial de un plato
src/
  lib/                   # datos y lógica
  ui/                    # tokens de diseño y componentes base
  components/            # piezas con lógica de la app
  hooks/                 # consultas reactivas (useLiveQuery de Drizzle)
verify/                  # comprobaciones (Node, no van dentro del APK)
scripts/                 # compilar y firmar el APK
```

## Diseño: «Sala oscura»

La foto del plato es lo único que pone color; la interfaz es monocroma **sin color de acento**, y la
jerarquía la marca el contraste. El color solo aparece con significado: rojo para borrar, ámbar para
el aviso de copia. Todo sale de [`src/ui/theme.ts`](src/ui/theme.ts).

Hay tema claro además del oscuro, con el mismo criterio; se elige en Ajustes.

## Historia: antes era una PWA

Hasta agosto de 2026 esto era una PWA (HTML + JS a pelo, con IndexedDB) pensada para GitHub Pages.
Se reescribió como app nativa por lo mismo que Ludok Time: en GrapheneOS una PWA
[no llega a ser una app](https://discuss.grapheneos.org/d/4175-does-pwa-use-webview-or-vanadium),
y en la web había que *pedirle* al navegador que no borrara los datos
(`navigator.storage.persist()`), que podía negarse. En nativo solo desaparecen si desinstalas.

**Las copias de aquella versión se siguen pudiendo importar.** El importador las reconoce por el
campo `version` y traduce lo que cambió: fechas de texto ISO a milisegundos, precios escritos a mano
(«2,50») a números, cadenas vacías a campos ausentes y las fotos en `data:` URL a ficheros. Está
todo en [`src/lib/legacy.ts`](src/lib/legacy.ts), con su prueba en `verify:data`.

El código web sigue en el historial de git.
