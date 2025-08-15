/**
 * Platform-agnostic form types and interfaces
 */

export type FieldValue = string | number | boolean | Date | null | undefined;

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio';
  value: FieldValue;
  defaultValue?: FieldValue;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options?: Array<{ label: string; value: FieldValue }>;
  validation?: ValidationRule[];
  metadata?: {
    description?: string;
    helpText?: string;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    step?: number;
  };
}

export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'custom';
  message: string;
  value?: any;
  validator?: (value: FieldValue, formData?: Record<string, FieldValue>) => boolean | Promise<boolean>;
}

export interface FormErrors {
  [fieldName: string]: string[];
}

export interface FormState {
  fields: Record<string, FormField>;
  values: Record<string, FieldValue>;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
  lastSubmissionResult?: FormSubmissionResult;
}

export interface FormConfig {
  fields: FormField[];
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  revalidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  submitOnEnter?: boolean;
  resetOnSubmit?: boolean;
  validateOnMount?: boolean;
}

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  errors?: FormErrors | string;
  timestamp: Date;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submitCount: number;
  lastResult?: FormSubmissionResult;
}

// Event types for form interactions
export type FormEvent = 
  | { type: 'FIELD_CHANGE'; fieldName: string; value: FieldValue }
  | { type: 'FIELD_BLUR'; fieldName: string }
  | { type: 'FIELD_FOCUS'; fieldName: string }
  | { type: 'FORM_SUBMIT'; values: Record<string, FieldValue> }
  | { type: 'FORM_RESET' }
  | { type: 'VALIDATION_ERROR'; errors: FormErrors }
  | { type: 'SUBMISSION_START' }
  | { type: 'SUBMISSION_SUCCESS'; result: FormSubmissionResult }
  | { type: 'SUBMISSION_ERROR'; result: FormSubmissionResult };

// Form submission handler interface
export interface FormSubmissionHandler {
  (values: Record<string, FieldValue>): Promise<FormSubmissionResult>;
}

// Form adapter for platform-specific implementations
export interface FormAdapter {
  // Platform-specific form rendering
  renderField(field: FormField): any;
  renderForm(config: FormConfig, children: any[]): any;
  
  // Platform-specific validation styling
  applyValidationStyling(field: FormField, hasError: boolean): any;
  
  // Platform-specific event handling
  onFieldChange(fieldName: string, value: FieldValue): void;
  onFieldBlur(fieldName: string): void;
  onFormSubmit(values: Record<string, FieldValue>): void;
}

// Pre-defined form field types for the app
export interface BookFormData {
  title: string;
  isbn?: string;
  authors: number[];
  categories: number[];
  description?: string;
  publishedDate?: Date;
  publisher?: string;
  pageCount?: number;
  language?: string;
  status: 'in-progress' | 'paused' | 'finished';
  rating?: number;
  notes?: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  preferences?: {
    emailNotifications: boolean;
    publicProfile: boolean;
    showReadingGoals: boolean;
  };
}

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  rememberMe?: boolean;
}

export interface SearchFormData {
  query: string;
  category?: number;
  author?: number;
  status?: 'in-progress' | 'paused' | 'finished';
  rating?: number;
  sortBy?: 'title' | 'author' | 'publishedDate' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}