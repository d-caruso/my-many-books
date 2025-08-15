/**
 * Shared forms system for My Many Books monorepo
 * Platform-agnostic form validation, state management, and utilities
 */

// Form types and interfaces
export {
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

// React hooks for form management
export { 
  useForm, 
  useFormField, 
  useFormValidation, 
  useFormSubmission 
} from './hooks';