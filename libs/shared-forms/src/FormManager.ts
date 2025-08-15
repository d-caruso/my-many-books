/**
 * Platform-agnostic form state management
 * Handles form state, validation, and submission logic
 */

import { 
  FormState, 
  FormConfig, 
  FormField, 
  FieldValue, 
  FormErrors, 
  FormEvent,
  FormSubmissionHandler,
  FormSubmissionResult
} from './types';
import { FormValidator } from './FormValidator';

export class FormManager {
  private state: FormState;
  private config: FormConfig;
  private validator: FormValidator;
  private eventListeners: ((event: FormEvent) => void)[] = [];
  private submissionHandler?: FormSubmissionHandler;

  constructor(config: FormConfig, submissionHandler?: FormSubmissionHandler) {
    this.config = config;
    this.validator = new FormValidator();
    this.submissionHandler = submissionHandler;
    
    // Initialize state
    this.state = this.createInitialState(config);
    
    // Validate on mount if configured
    if (config.validateOnMount) {
      this.validateForm();
    }
  }

  // State management
  getState(): FormState {
    return { ...this.state };
  }

  getFieldValue(fieldName: string): FieldValue {
    return this.state.values[fieldName];
  }

  getFieldError(fieldName: string): string[] {
    return this.state.errors[fieldName] || [];
  }

  isFieldTouched(fieldName: string): boolean {
    return this.state.touched[fieldName] || false;
  }

  hasFieldError(fieldName: string): boolean {
    return this.getFieldError(fieldName).length > 0;
  }

  // Field operations
  setFieldValue(fieldName: string, value: FieldValue): void {
    if (!this.state.fields[fieldName]) {
      console.warn(`Field "${fieldName}" does not exist in form`);
      return;
    }

    this.state.values[fieldName] = value;
    this.state.fields[fieldName].value = value;
    this.state.isDirty = true;

    this.emit({ type: 'FIELD_CHANGE', fieldName, value });

    // Validate on change if configured
    if (this.config.validationMode === 'onChange') {
      this.validateField(fieldName);
    }
  }

  setFieldTouched(fieldName: string, touched: boolean = true): void {
    this.state.touched[fieldName] = touched;

    this.emit({ type: 'FIELD_BLUR', fieldName });

    // Validate on blur if configured
    if (touched && this.config.validationMode === 'onBlur') {
      this.validateField(fieldName);
    }
  }

  setFieldError(fieldName: string, errors: string[]): void {
    if (errors.length === 0) {
      delete this.state.errors[fieldName];
    } else {
      this.state.errors[fieldName] = errors;
    }
    
    this.updateFormValidation();
  }

  // Validation
  async validateField(fieldName: string): Promise<boolean> {
    const field = this.state.fields[fieldName];
    if (!field) return true;

    const errors = await this.validator.validateField(field, this.state.values);
    this.setFieldError(fieldName, errors);
    
    return errors.length === 0;
  }

  async validateForm(): Promise<boolean> {
    const errors: FormErrors = {};
    
    for (const fieldName of Object.keys(this.state.fields)) {
      const field = this.state.fields[fieldName];
      const fieldErrors = await this.validator.validateField(field, this.state.values);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    }

    this.state.errors = errors;
    this.updateFormValidation();

    if (!this.state.isValid) {
      this.emit({ type: 'VALIDATION_ERROR', errors });
    }

    return this.state.isValid;
  }

  // Form operations
  async submit(): Promise<FormSubmissionResult | null> {
    this.state.isSubmitting = true;
    this.state.submitCount++;
    
    this.emit({ type: 'SUBMISSION_START' });

    try {
      // Validate form before submission
      const isValid = await this.validateForm();
      
      if (!isValid) {
        const result: FormSubmissionResult = {
          success: false,
          errors: this.state.errors,
          timestamp: new Date()
        };
        
        this.state.lastSubmissionResult = result;
        this.state.isSubmitting = false;
        
        this.emit({ type: 'SUBMISSION_ERROR', result });
        return result;
      }

      // Submit form
      if (!this.submissionHandler) {
        throw new Error('No submission handler provided');
      }

      const result = await this.submissionHandler(this.state.values);
      
      this.state.lastSubmissionResult = result;
      this.state.isSubmitting = false;

      if (result.success) {
        this.emit({ type: 'SUBMISSION_SUCCESS', result });
        
        // Reset form if configured
        if (this.config.resetOnSubmit) {
          this.reset();
        }
      } else {
        this.emit({ type: 'SUBMISSION_ERROR', result });
        
        // Handle server-side validation errors
        if (result.errors && typeof result.errors !== 'string') {
          this.state.errors = { ...this.state.errors, ...result.errors };
          this.updateFormValidation();
        }
      }

      return result;
      
    } catch (error) {
      const result: FormSubmissionResult = {
        success: false,
        errors: error instanceof Error ? error.message : 'Submission failed',
        timestamp: new Date()
      };
      
      this.state.lastSubmissionResult = result;
      this.state.isSubmitting = false;
      
      this.emit({ type: 'SUBMISSION_ERROR', result });
      return result;
    }
  }

  reset(): void {
    this.state = this.createInitialState(this.config);
    this.emit({ type: 'FORM_RESET' });
  }

  // Bulk operations
  setValues(values: Record<string, FieldValue>): void {
    Object.entries(values).forEach(([fieldName, value]) => {
      if (this.state.fields[fieldName]) {
        this.state.values[fieldName] = value;
        this.state.fields[fieldName].value = value;
      }
    });
    
    this.state.isDirty = true;

    // Validate if configured
    if (this.config.validationMode === 'onChange') {
      this.validateForm();
    }
  }

  setErrors(errors: FormErrors): void {
    this.state.errors = { ...errors };
    this.updateFormValidation();
    this.emit({ type: 'VALIDATION_ERROR', errors });
  }

  // Configuration updates
  updateField(fieldName: string, updates: Partial<FormField>): void {
    const field = this.state.fields[fieldName];
    if (!field) return;

    this.state.fields[fieldName] = { ...field, ...updates };
    
    // Update value if provided
    if (updates.value !== undefined) {
      this.state.values[fieldName] = updates.value;
    }
  }

  addField(field: FormField): void {
    this.state.fields[field.name] = field;
    this.state.values[field.name] = field.value ?? field.defaultValue;
    this.state.touched[field.name] = false;
    
    if (field.validation && field.value) {
      this.validateField(field.name);
    }
  }

  removeField(fieldName: string): void {
    delete this.state.fields[fieldName];
    delete this.state.values[fieldName];
    delete this.state.errors[fieldName];
    delete this.state.touched[fieldName];
    
    this.updateFormValidation();
  }

  // Event system
  addEventListener(listener: (event: FormEvent) => void): () => void {
    this.eventListeners.push(listener);
    
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // Utility methods
  getFieldNames(): string[] {
    return Object.keys(this.state.fields);
  }

  getFormData(): Record<string, FieldValue> {
    return { ...this.state.values };
  }

  getDirtyFields(): string[] {
    return Object.keys(this.state.fields).filter(fieldName => {
      const field = this.state.fields[fieldName];
      return field.value !== field.defaultValue;
    });
  }

  getTouchedFields(): string[] {
    return Object.keys(this.state.touched).filter(fieldName => 
      this.state.touched[fieldName]
    );
  }

  // Private methods
  private createInitialState(config: FormConfig): FormState {
    const fields: Record<string, FormField> = {};
    const values: Record<string, FieldValue> = {};
    const touched: Record<string, boolean> = {};

    config.fields.forEach(field => {
      fields[field.name] = { ...field };
      values[field.name] = field.value ?? field.defaultValue;
      touched[field.name] = false;
    });

    return {
      fields,
      values,
      errors: {},
      touched,
      isValid: true,
      isSubmitting: false,
      isDirty: false,
      submitCount: 0
    };
  }

  private updateFormValidation(): void {
    this.state.isValid = Object.keys(this.state.errors).length === 0;
  }

  private emit(event: FormEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Form event listener error:', error);
      }
    });
  }
}