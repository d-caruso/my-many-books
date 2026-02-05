# My Many Books - Mobile App

React Native mobile application for managing your personal book library.

## Features

- 📚 Manage your personal book collection
- 🔍 Search for books by title, author, or ISBN
- 📱 Scan book barcodes with camera
- 🌙 Dark/Light theme support
- 💾 Offline data caching
- 📊 Reading progress tracking

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on device/simulator:
```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

## Development

### Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # App screens
├── hooks/          # Custom React hooks
├── contexts/       # React contexts
├── services/       # API services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── __tests__/      # Test files
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run typecheck
```

## Building for Production

### Android

```bash
npm run build:android
```

### iOS

```bash
npm run build:ios
```

## Architecture

The mobile app follows a component-based architecture with:

- **Expo Router** for navigation
- **React Native Paper** for UI components
- **SQLite** for local data persistence
- **AsyncStorage** for settings and preferences
- **Shared libraries** for business logic and API integration

## API Integration

The mobile app integrates with the My Many Books API through shared libraries:

- `@my-many-books/shared-api` - API client
- `@my-many-books/shared-types` - TypeScript types
- `@my-many-books/shared-utils` - Utility functions
- `@my-many-books/shared-business` - Business logic

### API Configuration

Expo public environment variables are defined in `apps/mobile/.env`:

- `EXPO_PUBLIC_API_ORIGIN` (example: `http://localhost:3001`)
- `EXPO_PUBLIC_API_PREFIX` (example: `/api`)
- `EXPO_PUBLIC_API_VERSION` (example: `v1`)

Optional legacy override:

- `EXPO_PUBLIC_API_URL` (full base URL, includes prefix + version)

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is part of the My Many Books application suite.
