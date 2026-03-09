/**
 * Shared forms system for My Many Books monorepo
 * Platform-agnostic form validation, state management, and utilities
 */

// Form types and interfaces
export type {
  FormField,
  FormState,
  FormConfig,
  ValidationRule,
  FormErrors,
  FieldValue,
  FormSubmissionState
} from './types';

// Form manager and validation
export { FormManager } from './FormManager';
export { FormValidator } from './FormValidator';

// Pre-configured form schemas for the app
export { bookFormSchema, userFormSchema, authFormSchemas } from './schemas';

// Edition date helpers shared by web/mobile inputs
export {
  EDITION_DATE_MONTHS,
  formatEditionDate,
  parseEditionDateParts,
  assembleEditionDate,
  getCurrentEditionYear,
  sanitizeEditionYearInput,
  stepEditionYear,
  isValidEditionDateYear,
  isLeapYear,
  getEditionDateDaysInMonth
} from './editionDate';
export type { EditionDateParts, EditionYearStepDirection } from './editionDate';

// React hooks for form management
export { 
  useForm, 
  useFormField, 
  useFormValidation, 
  useFormSubmission 
} from './hooks';
