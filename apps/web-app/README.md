# Web App

> **Part of [My Many Books Monorepo](../../README.md)**

A React-based Progressive Web Application for managing personal book collections.

## Features

- Personal book library management
- Progressive Web App (PWA) capabilities
- ISBN barcode scanning
- Book search and filtering
- Configurable themes and responsive design
- Integration with My Many Books API

## Tech Stack

- **React 18** with TypeScript
- **Progressive Web App** (PWA) support
- **Responsive Design** with mobile-first approach
- **Configurable Theming** system
- **ISBN Scanner** integration
- **REST API** integration

## Development Roadmap

- React setup with TypeScript
- PWA configuration
- ISBN scanner component
- Book search functionality
- Book management components
- API integration
- Frontend testing suite
- Responsive design implementation
- Configurable color palette system

## Development

From the monorepo root:

```bash
# Install dependencies for entire monorepo
npm install

# Start web app development server
npm run serve:web-app
# OR
nx serve web-app

# Run tests
npm run test:web-app
# OR
nx test web-app

# Build for production
npm run build:web-app
# OR
nx build web-app

# Lint code
npm run lint:web-app
# OR
nx lint web-app
```

## Branch Structure

- `main` - Production-ready releases
- `develop` - Integration branch
- `feature/*` - Feature development branches

## API Integration

This frontend integrates with the [My Many Books API](../my-many-books-api) for:
- User authentication
- Book CRUD operations
- ISBN lookup services
- User library management

## License

MIT