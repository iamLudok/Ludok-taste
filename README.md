<div align="center">

<img src="assets/icon.png" alt="Ludok Taste icon" width="96">

# Ludok Taste

**A restaurant diary for your phone: remember what you ordered, and whether it was worth it.**

Every dish you try, with its rating, a comment and a photo, so you never order blind again.<br>
Your data lives on your phone. No accounts. No servers. No tracking.

[![License: MIT](https://img.shields.io/github/license/iamLudok/Ludok-taste?style=flat-square&color=blue)](LICENSE)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=flat-square&logo=android&logoColor=white)](https://github.com/iamLudok/Ludok-taste/releases)
[![SQLite](https://img.shields.io/badge/SQLite-local--first-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)

[Features](#features) · [Download](#download) · [Build](#building-from-source) · [Backups](#backups) · [License](#license)

</div>

---

<!--
## Screenshots

<p align="center">
  <img src="docs/screenshots/restaurants.png" width="230" alt="Restaurant list">
  <img src="docs/screenshots/what-to-order.png" width="230" alt="What should I order today?">
  <img src="docs/screenshots/stats.png" width="230" alt="Stats">
</p>
-->

## Table of Contents

- [Why Ludok Taste?](#why-ludok-taste)
- [Features](#features)
- [Download](#download)
- [Backups](#backups)
- [Building from Source](#building-from-source)
- [How the Data Layer Is Tested](#how-the-data-layer-is-tested)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Why Ludok Taste?

You go back to a restaurant you liked and can't remember which dish was the great one and which
one you swore never to order again. Ludok Taste remembers for you.

Its first rule is **never lose data**. Everything else comes second.

- 📱 **Local-first**: everything is stored in a SQLite database inside the app. No accounts, no cloud, no analytics.
- 💾 **Complete backups**: export everything to a single JSON file, **photos included**, and import it on any phone.
- ☁️ **Automatic Nextcloud backup** (optional): uploads a copy to your own Nextcloud when you open the app on WiFi.
- 🧪 **Tested data layer**: the same code that runs on the phone is tested against a real SQLite database (see [below](#how-the-data-layer-is-tested)).

> **What leaves your phone:** nothing, unless you set up the Nextcloud backup. If you do, the
> backup goes straight to your server and nowhere else.

---

## Features

| Level | What it stores |
|---|---|
| Restaurant | Name, city, notes and how much of the menu you've tried |
| Dish | Category, price, description, and whether it's still on the menu |
| Every time you eat it | Date, 1–5 ★ rating, comment and photo (resized to 1280 px) |

- 🍽️ **"What should I order today?"**: a tab inside each restaurant with your favourites (4★ or more), what you haven't tried yet, and what you already know to avoid (2★ or less).
- 📊 **Stats**: restaurants, dishes tried, menus completed, average rating, estimated spending and your best-rated dishes.
- 💶 **Estimated spending**, per restaurant and overall, based on the price of each dish you've logged.
- 🌗 **Dark and light theme**, selectable in *Ajustes → Tema*.
- ⚠️ **Backup reminder** on the home screen if you haven't made a backup in 7 days.

The app's interface is in Spanish.

---

## Download

Grab the latest signed APK from the [Releases](https://github.com/iamLudok/Ludok-taste/releases) page
and install it on your Android phone (you'll need to allow installing apps from unknown sources).

Updates install **on top of** the previous version and keep your data, as long as they come from
the same Releases page (same signing key).

---

## Backups

### Manual backup

**Ajustes → Copia de seguridad → Exportar copia** exports everything to a single JSON file you can save or share wherever you
want. Photos travel inside the file as `data:` URLs, so a backup is **one self-contained file**.
That costs about 200 KB per photo.

Importing **replaces everything**. Photos on the phone that are no longer referenced are swept
automatically ([`prunePhotos`](src/lib/photos.ts)), so they don't pile up import after import.

### Automatic backup to Nextcloud

In **Ajustes → Copia automática a Nextcloud**, enter your server URL, user, password and folder.
When you open the app on WiFi, it uploads a backup at most once every 12 hours, with one file per day.

- **WiFi only**, because backups include photos and can be tens of megabytes.
- Use a Nextcloud **[app password](https://docs.nextcloud.com/server/latest/user_manual/en/session_management.html#managing-devices)**, not your account password, so you can revoke it at any time.
- That password is **never included in exported backups**. A backup is meant to be shared and moved around, and the password grants write access to your files. A test in `verify:data` checks this.
- No background task is used on purpose: Android kills them silently, and you'd never know whether they worked. Since you open the app at the table to log what you ordered, backups end up being frequent anyway.

> The app allows plain `http://` traffic (`usesCleartextTraffic`) so it can reach a Nextcloud on your
> home network. Use HTTPS or a VPN if your server is reachable from outside.

---

## Building from Source

### Requirements

- Node.js and npm
- JDK 17
- Android SDK with API 36, and `adb`
- An Android phone connected over USB (or an emulator)

### Run in development

```bash
git clone https://github.com/iamLudok/Ludok-taste.git
cd Ludok-taste
npm install
npm run android      # builds, installs and opens the app on a phone connected via adb
npm run typecheck    # types for the app and the verification scripts
npm run verify       # tests the data layer
```

> Gradle needs a **Java 17** toolchain. If it fails with *"Cannot find a Java installation matching
> languageVersion=17"* while you have a newer JDK, point it to the one Gradle already downloaded:
>
> ```bash
> export JAVA_HOME=~/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2
> ```

### Build a release APK

The build script signs the APK with your own keystore. Create one and describe it in a
`keystore.properties` file at the project root (both are in `.gitignore`):

```bash
keytool -genkeypair -v -keystore release.jks -alias ludok-taste \
  -keyalg RSA -keysize 2048 -validity 10000
```

```properties
storeFile=release.jks
storePassword=...
keyAlias=ludok-taste
keyPassword=...
```

Then:

```bash
npm run build:apk                    # all architectures
./scripts/build-apk.sh --compartir   # arm64-v8a only, smaller, for sharing
# → android/app/build/outputs/apk/release/app-release.apk

adb install -r android/app/build/outputs/apk/release/app-release.apk
```

It has to be a **release** build: a debug APK loads its JavaScript from the Metro server, so it
doesn't work without your computer.

> ⚠️ **Keep your keystore safe.** Android only installs an APK on top of another if both are signed
> with the same key. If you lose it, the only way to install a new version is to uninstall the
> app, and **uninstalling deletes its data**. It's the one thing in this project that can't be
> regenerated.

---

## How the Data Layer Is Tested

Data is the part that can't fail, so it's tested by running **the same code that runs on the phone**
against a desktop SQLite:

```bash
npm run verify:data       # backup format: round trip, photos, missing fields, volume, rejections
npm run verify:library    # rules: progress, "what to order", stats, deletions
npm run verify:migration  # the schema is created idempotently
```

This works because the logic gets its database from [`src/lib/dbRef.ts`](src/lib/dbRef.ts) instead of
creating it: [`src/lib/db.ts`](src/lib/db.ts) is the **only** file that touches `expo-sqlite`.
Photos follow the same idea: [`backupCore.ts`](src/lib/backupCore.ts) receives a `PhotoCodec`
instead of importing `expo-file-system`, and the tests pass it an in-memory one.

The tests use **libsql** rather than `better-sqlite3`, because the latter is synchronous and doesn't
support async transactions, while `expo-sqlite` does. With libsql the semantics match the real thing.

---

## Project Structure

```
Ludok-taste/
├── app/                    ← Routes (expo-router)
│   ├── (tabs)/             ← Restaurants, Stats, Settings
│   ├── restaurante/[id]    ← Menu and "what should I order today?"
│   └── plato/[id]          ← History of a single dish
├── src/
│   ├── lib/                ← Data and logic (SQLite, Drizzle, backups, Nextcloud)
│   ├── ui/                 ← Design tokens and base components
│   ├── components/         ← App-specific components
│   └── hooks/              ← Reactive queries (Drizzle's useLiveQuery)
├── verify/                 ← Data layer tests (Node, not shipped in the APK)
├── scripts/
│   └── build-apk.sh        ← Builds and signs the release APK
├── assets/                 ← Icon and splash screen
├── app.json                ← Expo configuration
└── package.json
```

The `android/` folder is generated by `expo prebuild` and is not committed.

---

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup and
conventions. To report a security vulnerability, follow [SECURITY.md](SECURITY.md) instead of
opening a public issue.

---

## License

Distributed under the **MIT License**. You are free to use, modify and share Ludok Taste, including
for commercial use, as long as you keep the copyright notice. See [LICENSE](LICENSE) for the full text.

---

<div align="center">

Made by [Luken Iriondo](https://github.com/iamLudok) · If Ludok Taste is useful to you, consider giving it a ⭐

</div>
