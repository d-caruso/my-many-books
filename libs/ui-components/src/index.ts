/**
 * Shared UI Components for My Many Books monorepo
 * Platform-agnostic components that work with web, mobile, and desktop apps
 */

// Button components
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button.types';

// BookCard components
export { BookCard, formatBookCardData, getStatusColor, getStatusLabel } from './BookCard/BookCard';
export type { BookCardProps, BookCardData } from './BookCard/BookCard.types';

// Loading components
export { LoadingSpinner } from './LoadingSpinner/LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner/LoadingSpinner';

// Input components  
export { TextInput } from './TextInput/TextInput';
export type { TextInputProps } from './TextInput/TextInput.types';

// Shared styling utilities
export { buttonStyles } from './Button/Button.styles';