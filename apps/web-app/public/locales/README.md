# ⚠️ WARNING: DO NOT EDIT THESE FILES DIRECTLY

## These translation files are AUTO-GENERATED

**Source of truth:** `libs/shared-i18n/src/locales/`

**This directory:** `apps/web-app/public/locales/` (auto-synced from source)

---

## How Translation Sync Works

This directory contains **copies** of translations from `libs/shared-i18n/src/locales/` that are used by the web-app via HTTP backend for lazy loading.

### Automatic Sync

Translations are automatically synced when you run:

```bash
npm run start          # Syncs before starting dev server
npm run build          # Syncs before building
npm run sync-translations  # Manual sync
```

The sync script (`scripts/sync-translations.sh`) copies translations **one-way**:
- Source: `libs/shared-i18n/src/locales/` ✅
- Destination: `apps/web-app/public/locales/` (this folder) ❌

### ⚠️ Any changes made to files in this directory WILL BE OVERWRITTEN

---

## How to Add/Edit Translations

### ✅ DO: Edit in shared-i18n (source of truth)

```bash
# 1. Edit translation files
vi libs/shared-i18n/src/locales/en/common.json

# 2. Sync to web-app (automatic on start/build, or manual)
npm run sync-translations

# 3. Rebuild shared-i18n library (if API needs changes)
cd libs/shared-i18n && npm run build
```

### ❌ DON'T: Edit files in this directory

Changes here will be lost on next sync!

---

## Why Does Web-App Have Separate Translation Files?

**Performance optimization**: The web-app uses `i18next-http-backend` for **lazy loading** translations.

- Initial load: Only critical namespaces (~15KB)
- On-demand: Other namespaces load when needed

This keeps the initial bundle small and improves First Contentful Paint.

**Contrast with Mobile App:**
- Mobile bundles ALL translations (they're already in the .apk/.ipa)
- Mobile imports directly from `shared-i18n`
- No duplication, no HTTP requests

---

## Translation Files in This Directory

```
locales/
├── en/
│   ├── common.json       ← Basic UI (buttons, labels)
│   ├── books.json        ← Book-related terms
│   ├── pages.json        ← Page titles, navigation
│   ├── search.json       ← Search functionality
│   ├── pwa.json          ← PWA prompts
│   ├── dialogs.json      ← Modal dialogs
│   ├── scanner.json      ← Barcode scanner (lazy)
│   ├── theme.json        ← Theme switcher (lazy)
│   ├── validation.json   ← Form validation (lazy)
│   ├── errors.json       ← Error messages (lazy)
│   └── accessibility.json ← A11y labels (lazy)
└── it/
    └── (same structure)
```

**Lazy loaded** = Only fetched when user visits that feature

---

## Troubleshooting

### Translations are out of sync

Run sync manually:
```bash
npm run sync-translations
```

### I accidentally edited files here

Your changes will be lost on next sync. Copy your changes to `libs/shared-i18n/src/locales/` and re-sync.

### Sync script fails

Check that rsync is installed:
```bash
which rsync  # Should show: /usr/bin/rsync
```

---

**Last Updated:** 2025-12-11
**Source Script:** `scripts/sync-translations.sh`
