// ================================================================
// src/utils/isbn.ts
// ================================================================
//
// REFACTORED: This file now uses @my-many-books/shared-validation
// for all ISBN validation logic. Keeping this wrapper for
// backwards compatibility with existing API code.
//
// Migration: Core validation logic moved to shared-validation library
// to ensure consistency between frontend and backend.
//

import {
  validateIsbn as sharedValidateIsbn,
  formatIsbnForDisplay as sharedFormatIsbnForDisplay,
  isLikelyIsbn as sharedIsLikelyIsbn,
  extractIsbn as sharedExtractIsbn,
  type IsbnValidationResult as SharedIsbnValidationResult,
} from '@my-many-books/shared-validation';

// Re-export the shared type for backwards compatibility
export type IsbnValidationResult = SharedIsbnValidationResult;

/**
 * ISBN Utilities Class
 *
 * @deprecated This class wraps shared-validation library functions.
 * New code should import directly from @my-many-books/shared-validation
 */
export class IsbnUtils {
  /**
   * Validates and normalizes an ISBN string
   * @param isbn - Raw ISBN string from scanner or user input
   * @returns Validation result with normalized ISBN
   */
  static validate(isbn: string): IsbnValidationResult {
    return sharedValidateIsbn(isbn);
  }

  /**
   * Formats ISBN with standard hyphens for display
   */
  static formatForDisplay(isbn: string): string {
    return sharedFormatIsbnForDisplay(isbn);
  }

  /**
   * Quick check if a string could be an ISBN
   */
  static isLikelyIsbn(input: string): boolean {
    return sharedIsLikelyIsbn(input);
  }

  /**
   * Extract potential ISBN from a longer string
   */
  static extractIsbn(input: string): string | null {
    return sharedExtractIsbn(input);
  }
}

// Export convenience functions (delegating to shared-validation)
export const validateIsbn = (isbn: string): IsbnValidationResult => sharedValidateIsbn(isbn);

export const formatIsbn = (isbn: string): string => sharedFormatIsbnForDisplay(isbn);

export const isValidIsbn = (isbn: string): boolean => sharedValidateIsbn(isbn).isValid;

export const normalizeIsbn = (isbn: string): string | null => {
  const result = sharedValidateIsbn(isbn);
  return result.isValid && result.normalizedIsbn ? result.normalizedIsbn : null;
};
