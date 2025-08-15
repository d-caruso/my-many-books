/**
 * React hooks for form management (platform-agnostic)
 * Can be used with React web and React Native
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FormManager, 
  FormConfig, 
  FormState, 
  FormField, 
  FieldValue, 
  FormEvent,
  FormSubmissionHandler,
  FormSubmissionResult,
  FormSubmissionState
} from './types';

// Main form hook
export function useForm(
  config: FormConfig,
  submissionHandler?: FormSubmissionHandler
): {
  formManager: FormManager;
  state: FormState;
  setFieldValue: (fieldName: string, value: FieldValue) => void;
  setFieldTouched: (fieldName: string, touched?: boolean) => void;
  getFieldValue: (fieldName: string) => FieldValue;
  getFieldError: (fieldName: string) => string[];
  hasFieldError: (fieldName: string) => boolean;
  isFieldTouched: (fieldName: string) => boolean;
  validateField: (fieldName: string) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  submit: () => Promise<FormSubmissionResult | null>;
  reset: () => void;
  setValues: (values: Record<string, FieldValue>) => void;
  setErrors: (errors: Record<string, string[]>) => void;
} {
  const [formManager] = useState(() => new FormManager(config, submissionHandler));
  const [state, setState] = useState<FormState>(formManager.getState());

  // Update state when form events occur
  useEffect(() => {
    const unsubscribe = formManager.addEventListener((event: FormEvent) => {
      setState(formManager.getState());
    });

    return unsubscribe;
  }, [formManager]);

  // Form operations
  const setFieldValue = useCallback((fieldName: string, value: FieldValue) => {
    formManager.setFieldValue(fieldName, value);
  }, [formManager]);

  const setFieldTouched = useCallback((fieldName: string, touched: boolean = true) => {
    formManager.setFieldTouched(fieldName, touched);
  }, [formManager]);

  const getFieldValue = useCallback((fieldName: string) => {
    return formManager.getFieldValue(fieldName);
  }, [formManager]);

  const getFieldError = useCallback((fieldName: string) => {
    return formManager.getFieldError(fieldName);
  }, [formManager]);

  const hasFieldError = useCallback((fieldName: string) => {
    return formManager.hasFieldError(fieldName);
  }, [formManager]);

  const isFieldTouched = useCallback((fieldName: string) => {
    return formManager.isFieldTouched(fieldName);
  }, [formManager]);

  const validateField = useCallback(async (fieldName: string) => {
    return formManager.validateField(fieldName);
  }, [formManager]);

  const validateForm = useCallback(async () => {
    return formManager.validateForm();
  }, [formManager]);

  const submit = useCallback(async () => {
    return formManager.submit();
  }, [formManager]);

  const reset = useCallback(() => {
    formManager.reset();
  }, [formManager]);

  const setValues = useCallback((values: Record<string, FieldValue>) => {
    formManager.setValues(values);
  }, [formManager]);

  const setErrors = useCallback((errors: Record<string, string[]>) => {
    formManager.setErrors(errors);
  }, [formManager]);

  return {
    formManager,
    state,
    setFieldValue,
    setFieldTouched,
    getFieldValue,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    validateField,
    validateForm,
    submit,
    reset,
    setValues,
    setErrors
  };
}

// Individual field hook
export function useFormField(
  formManager: FormManager,
  fieldName: string
): {
  field: FormField | null;
  value: FieldValue;
  error: string[];
  hasError: boolean;
  isTouched: boolean;
  setValue: (value: FieldValue) => void;
  setTouched: (touched?: boolean) => void;
  validate: () => Promise<boolean>;
} {
  const [state, setState] = useState(formManager.getState());

  useEffect(() => {
    const unsubscribe = formManager.addEventListener((event: FormEvent) => {
      if (event.type === 'FIELD_CHANGE' && event.fieldName === fieldName) {
        setState(formManager.getState());
      } else if (event.type === 'FIELD_BLUR' && event.fieldName === fieldName) {
        setState(formManager.getState());
      } else if (event.type === 'VALIDATION_ERROR') {
        setState(formManager.getState());
      }
    });

    return unsubscribe;
  }, [formManager, fieldName]);

  const field = state.fields[fieldName] || null;
  const value = formManager.getFieldValue(fieldName);
  const error = formManager.getFieldError(fieldName);
  const hasError = error.length > 0;
  const isTouched = formManager.isFieldTouched(fieldName);

  const setValue = useCallback((newValue: FieldValue) => {
    formManager.setFieldValue(fieldName, newValue);
  }, [formManager, fieldName]);

  const setTouched = useCallback((touched: boolean = true) => {
    formManager.setFieldTouched(fieldName, touched);
  }, [formManager, fieldName]);

  const validate = useCallback(async () => {
    return formManager.validateField(fieldName);
  }, [formManager, fieldName]);

  return {
    field,
    value,
    error,
    hasError,
    isTouched,
    setValue,
    setTouched,
    validate
  };
}

// Form validation hook
export function useFormValidation(formManager: FormManager): {
  isValid: boolean;
  isSubmitting: boolean;
  errors: Record<string, string[]>;
  validate: () => Promise<boolean>;
  validateField: (fieldName: string) => Promise<boolean>;
} {
  const [state, setState] = useState(formManager.getState());

  useEffect(() => {
    const unsubscribe = formManager.addEventListener((event: FormEvent) => {
      if (event.type === 'VALIDATION_ERROR' || 
          event.type === 'FIELD_CHANGE' || 
          event.type === 'FIELD_BLUR') {
        setState(formManager.getState());
      }
    });

    return unsubscribe;
  }, [formManager]);

  const validate = useCallback(async () => {
    return formManager.validateForm();
  }, [formManager]);

  const validateField = useCallback(async (fieldName: string) => {
    return formManager.validateField(fieldName);
  }, [formManager]);

  return {
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    errors: state.errors,
    validate,
    validateField
  };
}

// Form submission hook
export function useFormSubmission(formManager: FormManager): {
  submissionState: FormSubmissionState;
  submit: () => Promise<FormSubmissionResult | null>;
  lastResult: FormSubmissionResult | undefined;
} {
  const [state, setState] = useState(formManager.getState());

  useEffect(() => {
    const unsubscribe = formManager.addEventListener((event: FormEvent) => {
      if (event.type === 'SUBMISSION_START' || 
          event.type === 'SUBMISSION_SUCCESS' || 
          event.type === 'SUBMISSION_ERROR') {
        setState(formManager.getState());
      }
    });

    return unsubscribe;
  }, [formManager]);

  const submissionState: FormSubmissionState = {
    isSubmitting: state.isSubmitting,
    hasSubmitted: state.submitCount > 0,
    submitCount: state.submitCount,
    lastResult: state.lastSubmissionResult
  };

  const submit = useCallback(async () => {
    return formManager.submit();
  }, [formManager]);

  return {
    submissionState,
    submit,
    lastResult: state.lastSubmissionResult
  };
}

// Convenience hooks for specific forms
export function useBookForm(
  submissionHandler?: FormSubmissionHandler,
  initialData?: Partial<Record<string, FieldValue>>
) {
  const { bookFormSchema } = require('./schemas');
  
  // Update schema with initial data if provided
  const configWithInitialData = useMemo(() => {
    if (!initialData) return bookFormSchema;
    
    const updatedFields = bookFormSchema.fields.map(field => ({
      ...field,
      value: initialData[field.name] ?? field.value
    }));
    
    return { ...bookFormSchema, fields: updatedFields };
  }, [initialData]);

  return useForm(configWithInitialData, submissionHandler);
}

export function useUserForm(
  submissionHandler?: FormSubmissionHandler,
  initialData?: Partial<Record<string, FieldValue>>
) {
  const { userFormSchema } = require('./schemas');
  
  const configWithInitialData = useMemo(() => {
    if (!initialData) return userFormSchema;
    
    const updatedFields = userFormSchema.fields.map(field => ({
      ...field,
      value: initialData[field.name] ?? field.value
    }));
    
    return { ...userFormSchema, fields: updatedFields };
  }, [initialData]);

  return useForm(configWithInitialData, submissionHandler);
}

export function useAuthForm(
  mode: 'login' | 'register',
  submissionHandler?: FormSubmissionHandler
) {
  const { authFormSchemas } = require('./schemas');
  return useForm(authFormSchemas[mode], submissionHandler);
}

export function useSearchForm(
  submissionHandler?: FormSubmissionHandler,
  categories?: Array<{ id: number; name: string }>,
  authors?: Array<{ id: number; name: string }>
) {
  const { searchFormSchema } = require('./schemas');
  
  const configWithOptions = useMemo(() => {
    const updatedFields = searchFormSchema.fields.map(field => {
      if (field.name === 'category' && categories) {
        return {
          ...field,
          options: [
            { label: 'All Categories', value: null },
            ...categories.map(cat => ({ label: cat.name, value: cat.id }))
          ]
        };
      }
      
      if (field.name === 'author' && authors) {
        return {
          ...field,
          options: [
            { label: 'All Authors', value: null },
            ...authors.map(author => ({ label: author.name, value: author.id }))
          ]
        };
      }
      
      return field;
    });
    
    return { ...searchFormSchema, fields: updatedFields };
  }, [categories, authors]);

  return useForm(configWithOptions, submissionHandler);
}

// Form field validation hooks
export function useFieldValidation(
  value: FieldValue,
  rules: import('./types').ValidationRule[],
  formValues?: Record<string, FieldValue>
): {
  errors: string[];
  isValid: boolean;
  validate: () => Promise<string[]>;
} {
  const [errors, setErrors] = useState<string[]>([]);

  const validate = useCallback(async () => {
    const { FormValidator } = require('./FormValidator');
    const validator = new FormValidator();
    
    const field: FormField = {
      id: 'temp',
      name: 'temp',
      label: 'temp',
      type: 'text',
      value,
      validation: rules
    };

    const fieldErrors = await validator.validateField(field, formValues || {});
    setErrors(fieldErrors);
    return fieldErrors;
  }, [value, rules, formValues]);

  useEffect(() => {
    validate();
  }, [validate]);

  return {
    errors,
    isValid: errors.length === 0,
    validate
  };
}

// Form auto-save hook
export function useFormAutoSave(
  formManager: FormManager,
  saveHandler: (values: Record<string, FieldValue>) => Promise<void>,
  delay: number = 2000
): {
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
} {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const saveNow = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveHandler(formManager.getFormData());
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formManager, saveHandler]);

  useEffect(() => {
    const unsubscribe = formManager.addEventListener((event: FormEvent) => {
      if (event.type === 'FIELD_CHANGE') {
        // Clear existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        
        // Set new timeout
        const newTimeout = setTimeout(() => {
          saveNow();
        }, delay);
        
        setSaveTimeout(newTimeout);
      }
    });

    return () => {
      unsubscribe();
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [formManager, saveNow, delay, saveTimeout]);

  return {
    isSaving,
    lastSaved,
    saveNow
  };
}