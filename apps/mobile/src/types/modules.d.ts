// Essential module declarations for React Native environment

// Image imports for React Native
declare module '*.png' {
  const value: number;
  export = value;
}

declare module '*.jpg' {
  const value: number;
  export = value;
}

declare module '*.jpeg' {
  const value: number;
  export = value;
}

declare module '*.gif' {
  const value: number;
  export = value;
}

declare module '*.svg' {
  const value: number;
  export = value;
}

// Workspace package type declarations for monorepo
declare module '@my-many-books/shared-types' {
  export * from '../../../libs/shared-types/src/index';
}

declare module '@my-many-books/shared-api' {
  export * from '../../../libs/shared-api/src/index';
}

declare module '@my-many-books/shared-utils' {
  export * from '../../../libs/shared-utils/src/index';
}

declare module '@my-many-books/shared-business' {
  export * from '../../../libs/shared-business/src/index';
}