/**
 * Platform-agnostic form validation engine
 * Handles field validation rules and custom validators
 */

import { FormField, ValidationRule, FieldValue } from './types';
import { isValidEmail, isValidUrl } from '@my-many-books/shared-utils';

export class FormValidator {
  
  async validateField(
    field: FormField, 
    formValues: Record<string, FieldValue>
  ): Promise<string[]> {
    const errors: string[] = [];
    
    if (!field.validation || field.validation.length === 0) {
      return errors;
    }

    for (const rule of field.validation) {
      const isValid = await this.validateRule(rule, field.value, formValues);
      
      if (!isValid) {
        errors.push(rule.message);
      }
    }

    return errors;
  }

  private async validateRule(
    rule: ValidationRule, 
    value: FieldValue, 
    formValues: Record<string, FieldValue>
  ): Promise<boolean> {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value);
        
      case 'email':
        return this.validateEmail(value);
        
      case 'url':
        return this.validateUrl(value);
        
      case 'minLength':
        return this.validateMinLength(value, rule.value);
        
      case 'maxLength':
        return this.validateMaxLength(value, rule.value);
        
      case 'pattern':
        return this.validatePattern(value, rule.value);
        
      case 'min':
        return this.validateMin(value, rule.value);
        
      case 'max':
        return this.validateMax(value, rule.value);
        
      case 'custom':
        return this.validateCustom(rule, value, formValues);
        
      default:
        console.warn(`Unknown validation rule type: ${rule.type}`);
        return true;
    }
  }

  private validateRequired(value: FieldValue): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'boolean') return true;
    if (value instanceof Date) return !isNaN(value.getTime());
    return true;
  }

  private validateEmail(value: FieldValue): boolean {
    if (!value || typeof value !== 'string') return true; // Optional field
    return isValidEmail(value);
  }

  private validateUrl(value: FieldValue): boolean {
    if (!value || typeof value !== 'string') return true; // Optional field
    return isValidUrl(value);
  }

  private validateMinLength(value: FieldValue, minLength: number): boolean {
    if (!value || typeof value !== 'string') return true; // Optional field
    return value.length >= minLength;
  }

  private validateMaxLength(value: FieldValue, maxLength: number): boolean {
    if (!value || typeof value !== 'string') return true; // Optional field
    return value.length <= maxLength;
  }

  private validatePattern(value: FieldValue, pattern: string): boolean {
    if (!value || typeof value !== 'string') return true; // Optional field
    const regex = new RegExp(pattern);
    return regex.test(value);
  }

  private validateMin(value: FieldValue, min: number): boolean {
    if (value === null || value === undefined) return true; // Optional field
    if (typeof value === 'number') return value >= min;
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue >= min;
    }
    if (value instanceof Date) return value.getTime() >= min;
    return true;
  }

  private validateMax(value: FieldValue, max: number): boolean {
    if (value === null || value === undefined) return true; // Optional field
    if (typeof value === 'number') return value <= max;
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue <= max;
    }
    if (value instanceof Date) return value.getTime() <= max;
    return true;
  }

  private async validateCustom(
    rule: ValidationRule, 
    value: FieldValue, 
    formValues: Record<string, FieldValue>
  ): Promise<boolean> {
    if (!rule.validator) {
      console.warn('Custom validation rule missing validator function');
      return true;
    }

    try {
      const result = await rule.validator(value, formValues);
      return result;
    } catch (error) {
      console.error('Custom validator error:', error);
      return false;
    }
  }

  // Utility methods for complex validation scenarios
  static createRequiredRule(message: string = 'This field is required'): ValidationRule {
    return { type: 'required', message };
  }

  static createEmailRule(message: string = 'Please enter a valid email address'): ValidationRule {
    return { type: 'email', message };
  }

  static createUrlRule(message: string = 'Please enter a valid URL'): ValidationRule {
    return { type: 'url', message };
  }

  static createMinLengthRule(length: number, message?: string): ValidationRule {
    return {
      type: 'minLength',
      value: length,
      message: message || `Must be at least ${length} characters`
    };
  }

  static createMaxLengthRule(length: number, message?: string): ValidationRule {
    return {
      type: 'maxLength',
      value: length,
      message: message || `Must not exceed ${length} characters`
    };
  }

  static createPatternRule(pattern: string, message: string): ValidationRule {
    return { type: 'pattern', value: pattern, message };
  }

  static createMinRule(min: number, message?: string): ValidationRule {
    return {
      type: 'min',
      value: min,
      message: message || `Must be at least ${min}`
    };
  }

  static createMaxRule(max: number, message?: string): ValidationRule {
    return {
      type: 'max',
      value: max,
      message: message || `Must not exceed ${max}`
    };
  }

  static createCustomRule(
    validator: (value: FieldValue, formData?: Record<string, FieldValue>) => boolean | Promise<boolean>,
    message: string
  ): ValidationRule {
    return { type: 'custom', validator, message };
  }

  // Common validation combinations
  static createPasswordRules(): ValidationRule[] {
    return [
      FormValidator.createRequiredRule('Password is required'),
      FormValidator.createMinLengthRule(8, 'Password must be at least 8 characters'),
      FormValidator.createPatternRule(
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      )
    ];
  }

  static createConfirmPasswordRules(): ValidationRule[] {
    return [
      FormValidator.createRequiredRule('Please confirm your password'),
      FormValidator.createCustomRule(
        (value, formData) => {
          return value === formData?.password;
        },
        'Passwords do not match'
      )
    ];
  }

  static createISBNRules(): ValidationRule[] {
    return [
      FormValidator.createPatternRule(
        '^(?=(?:\\D*\\d){10}(?:(?:\\D*\\d){3})?$)[\\d-]+$',
        'Please enter a valid ISBN-10 or ISBN-13'
      )
    ];
  }

  static createRatingRules(): ValidationRule[] {
    return [
      FormValidator.createMinRule(1, 'Rating must be at least 1'),
      FormValidator.createMaxRule(5, 'Rating cannot exceed 5')
    ];
  }

  static createYearRules(): ValidationRule[] {
    const currentYear = new Date().getFullYear();
    return [
      FormValidator.createMinRule(1000, 'Please enter a valid year'),
      FormValidator.createMaxRule(currentYear + 1, 'Year cannot be in the future')
    ];
  }
}