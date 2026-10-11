# Contributing to Ludok Taste

Thanks for your interest in Ludok Taste! It's a personal project, but contributions are welcome.

## Ways to Contribute

- **Code changes**: send a pull request directly. Fixes, improvements and new features are all welcome as PRs.
- **Bugs and ideas**: if you found something that doesn't work, or have an idea but don't want to code it, open a public [issue](https://github.com/iamLudok/Ludok-taste/issues).
- **Security vulnerabilities**: never in a public issue. Report them privately as explained in [SECURITY.md](SECURITY.md).

Before attaching a backup file, logs or screenshots, **remove any personal data**: restaurant notes,
photos, Nextcloud URLs and usernames.

## Development Setup

You need Node.js, JDK 17, the Android SDK (API 36) and `adb`, plus an Android phone or emulator.

```bash
git clone https://github.com/iamLudok/Ludok-taste.git
cd Ludok-taste
npm install
npm run android
```

Before opening a PR, make sure both of these pass:

```bash
npm run typecheck
npm run verify
```

To test a release build you'll need your own keystore; see [Build a release APK](README.md#build-a-release-apk).
**Never commit** `release.jks`, `keystore.properties` or the generated `android/` folder.

## Project Conventions

- **Code, comments and the app's interface are in Spanish**; the README and docs are in English.
- Follow the Expo SDK 57 docs: <https://docs.expo.dev/versions/v57.0.0/>. APIs have changed between SDK versions.
- [`src/lib/db.ts`](src/lib/db.ts) is the **only** file allowed to import `expo-sqlite`, and [`src/lib/photos.ts`](src/lib/photos.ts) the only one that touches photo files. The rest of the logic gets the database from `dbRef.ts` and photos through `PhotoCodec`, so it can be tested in Node.
- Colours, spacing and typography come from [`src/ui/theme.ts`](src/ui/theme.ts). No hardcoded colours in components, and no accent colour.
- Keep dependencies minimal.

## Changing the Data Model

Data loss is the one thing this app must never cause, so schema changes need extra care:

1. Update both [`src/lib/schema.ts`](src/lib/schema.ts) (Drizzle) and [`src/lib/schemaSql.ts`](src/lib/schemaSql.ts) (SQL), keeping the migration idempotent.
2. Update the row mapping in [`src/lib/rows.ts`](src/lib/rows.ts) and the types in [`src/types.ts`](src/types.ts).
3. Make sure **old backups still import**. If the backup format changes, handle the previous version on import.
4. Add or update checks in [`verify/`](verify) and run `npm run verify`.

## Pull Requests

- Keep each PR focused on one change.
- Describe what changed and how you tested it (on a real device, if it touches the UI).
- Update the README if you change a feature or the backup format.

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
