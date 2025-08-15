/**
 * Utility functions for ISBN validation and formatting
 * Shared across web app, mobile app, and API
 */

export interface ISBNValidationResult {
  isValid: boolean;
  type: 'ISBN-10' | 'ISBN-13' | null;
}

export const validateISBN = (isbn: string): ISBNValidationResult => {
  // Remove all non-digit and non-X characters
  const cleanISBN = isbn.replace(/[^0-9X]/gi, '').toUpperCase();
  
  if (cleanISBN.length === 10) {
    return { isValid: validateISBN10(cleanISBN), type: 'ISBN-10' };
  } else if (cleanISBN.length === 13) {
    return { isValid: validateISBN13(cleanISBN), type: 'ISBN-13' };
  } else {
    return { isValid: false, type: null };
  }
};

const validateISBN10 = (isbn: string): boolean => {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i]) * (10 - i);
  }
  
  const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
  sum += checkDigit;
  
  return sum % 11 === 0;
};

const validateISBN13 = (isbn: string): boolean => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = parseInt(isbn[12]);
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheckDigit;
};

export const formatISBN = (isbn: string): string => {
  const cleanISBN = isbn.replace(/[^0-9X]/gi, '').toUpperCase();
  
  if (cleanISBN.length === 10) {
    return `${cleanISBN.slice(0, 1)}-${cleanISBN.slice(1, 6)}-${cleanISBN.slice(6, 9)}-${cleanISBN.slice(9)}`;
  } else if (cleanISBN.length === 13) {
    return `${cleanISBN.slice(0, 3)}-${cleanISBN.slice(3, 4)}-${cleanISBN.slice(4, 9)}-${cleanISBN.slice(9, 12)}-${cleanISBN.slice(12)}`;
  }
  
  return isbn;
};

export const convertISBN10to13 = (isbn10: string): string | null => {
  const cleanISBN = isbn10.replace(/[^0-9X]/gi, '').toUpperCase();
  
  if (cleanISBN.length !== 10 || !validateISBN10(cleanISBN)) {
    return null;
  }
  
  // Remove check digit and add 978 prefix
  const isbn13WithoutCheck = '978' + cleanISBN.slice(0, 9);
  
  // Calculate new check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn13WithoutCheck[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return isbn13WithoutCheck + checkDigit;
};

export const normalizeISBN = (isbn: string): string => {
  return isbn.replace(/[^0-9X]/gi, '').toUpperCase();
};