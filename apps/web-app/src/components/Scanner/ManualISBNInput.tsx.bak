import React, { useState } from 'react';
import { ScanResult } from '../../types';

interface ManualISBNInputProps {
  onSubmit: (result: ScanResult) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const ManualISBNInput: React.FC<ManualISBNInputProps> = ({
  onSubmit,
  onCancel,
  isOpen
}) => {
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validate ISBN format
  const validateISBN = (code: string): boolean => {
    const cleanCode = code.replace(/[^0-9X]/gi, '');
    
    if (cleanCode.length === 10) {
      return validateISBN10(cleanCode);
    } else if (cleanCode.length === 13) {
      return validateISBN13(cleanCode);
    }
    
    return false;
  };

  const validateISBN10 = (isbn: string): boolean => {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    
    const lastChar = isbn[9];
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    if (isNaN(checkDigit) && lastChar !== 'X') return false;
    
    sum += checkDigit;
    return sum % 11 === 0;
  };

  const validateISBN13 = (isbn: string): boolean => {
    if (isbn.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = parseInt(isbn[12]);
    if (isNaN(checkDigit)) return false;
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    
    if (!cleanIsbn) {
      setError('Please enter an ISBN');
      return;
    }
    
    if (!validateISBN(cleanIsbn)) {
      setError('Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
      return;
    }
    
    setError(null);
    onSubmit({
      isbn: cleanIsbn,
      success: true
    });
    
    // Reset form
    setIsbn('');
  };

  const handleCancel = () => {
    setIsbn('');
    setError(null);
    onCancel();
  };

  // Helper function for future ISBN formatting (currently unused)
  // const formatISBN = (value: string) => {
  //   const cleaned = value.replace(/[^0-9X]/gi, '');
  //   
  //   if (cleaned.length <= 10) {
  //     return cleaned.replace(/(\d{1})(\d{3})(\d{5})(\d{1})/, '$1-$2-$3-$4');
  //   } else if (cleaned.length <= 13) {
  //     return cleaned.replace(/(\d{3})(\d{1})(\d{3})(\d{5})(\d{1})/, '$1-$2-$3-$4-$5');
  //   }
  //   
  //   return cleaned;
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsbn(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">
              Enter ISBN Manually
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-secondary-100 transition-colors"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="isbn" className="block text-sm font-medium text-text-secondary mb-2">
                ISBN (10 or 13 digits)
              </label>
              <input
                type="text"
                id="isbn"
                value={isbn}
                onChange={handleInputChange}
                placeholder="e.g., 978-0-123-45678-9"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  error
                    ? 'border-semantic-error bg-red-50'
                    : 'border-secondary-300 bg-background'
                } text-text-primary`}
                maxLength={17} // Account for dashes
                autoComplete="off"
              />
              {error && (
                <p className="mt-1 text-sm text-semantic-error">{error}</p>
              )}
            </div>

            <div className="mb-4 text-sm text-text-muted">
              <p className="mb-2">ISBN can be found on the back cover of most books, usually above or below the barcode.</p>
              <p>Examples:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>ISBN-10: 0123456789</li>
                <li>ISBN-13: 9780123456789</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-secondary-300 text-text-secondary rounded-lg hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isbn.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Book
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};