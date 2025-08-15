# My Many Books - Monorepo

A modern monorepo for managing personal book collections with web frontend and serverless API backend.

## Architecture

This monorepo follows industry-standard practices used by companies like Google, Facebook, and Microsoft, utilizing Nx for efficient build orchestration and dependency management.

### Structure

```
my-many-books/
├── apps/
│   ├── web-app/           # React frontend (Progressive Web App)
│   ├── api/               # Node.js/TypeScript serverless API
│   └── mobile-app/        # Future React Native mobile app
├── libs/
│   ├── shared-types/      # Shared TypeScript interfaces
│   ├── shared-api/        # API client logic
│   ├── ui-components/     # Shared React components
│   └── shared-utils/      # Business logic utilities
└── tools/                 # Build and deployment scripts
```

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

## Development Workflow

### Working with Nx

```bash
# Run affected builds (only changed projects)
nx affected --target=build

# Run affected tests
nx affected --target=test

# Visualize project dependencies
nx graph

# Generate a new library
nx g @nx/js:lib my-new-lib

# Generate a new React component
nx g @nx/react:component my-component --project=ui-components
```

### Code Organization

- **Feature-based**: Code is organized by business domain (books, users, auth)
- **Shared libraries**: Common functionality extracted to reusable libraries
- **Type safety**: Full TypeScript support with shared interfaces
- **Dependency management**: Nx ensures proper build order and caching

## Migration Information

This monorepo was created by migrating from separate repositories:
- **Frontend**: [my-many-books-web](https://github.com/d-caruso/my-many-books-web) *(now in maintenance mode)*
- **Backend**: [my-many-books-api](https://github.com/d-caruso/my-many-books-api) *(now in maintenance mode)*

All Git history has been preserved using subtree merges.

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