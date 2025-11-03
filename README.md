# My Many Books - Monorepo

A modern monorepo for managing personal book collections with web frontend and serverless API backend.

## Architecture

This project is built with a modern and scalable architecture that offers several benefits:

- **Code Sharing**: A monorepo structure allows for sharing code between the web and mobile apps, reducing duplication and improving consistency.
- **Type Safety**: The entire codebase is written in TypeScript, providing end-to-end type safety and reducing bugs.
- **Build Efficiency**: The build system is optimized to only rebuild what has changed, resulting in faster development cycles.
- **Scalability**: The architecture is designed to be scalable, making it easy to add new features and applications in the future.

## Quick Start

```bash
# Install dependencies
npm install

# Start all applications in development mode
npm run dev

# Build all applications
npm run build

# Run tests across all projects
npm run test

# Lint all projects
npm run lint
```

## Features

- **Book Management**: Add, edit, and delete books from your collection.
- **ISBN Scanning**: Easily add books by scanning their ISBN barcode.
- **Book Search**: Search your collection by title, author, or ISBN.
- **Reading Status**: Track the status of your books (e.g., To Read, Reading, Completed).
- **Offline Support**: Access your book collection even when you're offline (PWA feature).
- **Multi-language Support**: Available in English and Italian.

## Applications

### Web App (`apps/web-app`)
- **Tech Stack**: React 18, TypeScript, Material-UI, PWA
- **Features**: ISBN scanning, book search, responsive design, offline support
- **Development**: `nx serve web-app`
- **Build**: `nx build web-app`

### API (`apps/api`)
- **Tech Stack**: Node.js, TypeScript, AWS Lambda, Serverless Framework
- **Features**: RESTful API, ISBN lookup, user management, serverless architecture
- **Development**: `nx serve api`
- **Deploy**: `nx run api:deploy`

## Shared Libraries

### `@my-many-books/shared-types`
Common TypeScript interfaces and types used across both frontend and backend.

### `@my-many-books/shared-api`
API client with type-safe methods for frontend-backend communication.

### `@my-many-books/ui-components`
Reusable React components shared between web and future mobile applications.

### `@my-many-books/shared-utils`
Business logic utilities and helper functions.

## Internationalization (i18n)

This project uses `i18next` and `react-i18next` for internationalization. The configuration is located in the `libs/shared-i18n` library.

### How to use i18n in components

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return <p>{t('common:my_key')}</p>;
};
```

### How to add new translation keys

1.  Add the new key to `libs/shared-i18n/src/locales/en/common.json` (or the relevant namespace file).
2.  Add the corresponding translation to `libs/shared-i18n/src/locales/it/common.json`.

### Language Detection

-   **Web-App**: The language is detected from the browser settings, with a fallback to English. The user can also select a language from the language switcher in the header.
-   **API**: The language is detected from the `Accept-Language` header.

## Contributing

1. Create a feature branch from `main`
2. Make your changes in the appropriate app or library
3. Run `nx affected --target=test` to test affected projects
4. Run `nx affected --target=lint` to lint affected projects
5. Create a pull request

## Architecture Benefits

- **Code Sharing**: Shared libraries eliminate duplication
- **Type Safety**: End-to-end TypeScript with shared interfaces
- **Build Efficiency**: Nx only builds what changed
- **Scalability**: Easy to add new applications (mobile, desktop, etc.)
- **Developer Experience**: Unified tooling and workflow

## License

MIT License - see LICENSE file for details