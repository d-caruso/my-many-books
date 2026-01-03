/**
 * Book Validation Functions
 * 
 * Validates book data before operations to ensure data integrity
 * and provide meaningful error messages using i18n
 */

import { CreateBookPayload, UpdateBookPayload } from '../BookHandlers';

// Validation error structure
export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export class BookValidationError extends Error {
  public readonly errors: ValidationError[];
  public readonly code: string = 'VALIDATION_ERROR';

  constructor(errors: ValidationError[], message: string = 'Book validation failed') {
    super(message);
    this.name = 'BookValidationError';
    this.errors = errors;
  }
}

/**
 * Validate book creation payload
 */
export function validateCreateBook(data: CreateBookPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push({
      field: 'title',
      code: 'TITLE_REQUIRED',
      message: 'validation.book.title.required', // i18n key
    });
  } else if (data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      code: 'TITLE_EMPTY',
      message: 'validation.book.title.empty',
    });
  } else if (data.title.length > 255) {
    errors.push({
      field: 'title',
      code: 'TITLE_TOO_LONG',
      message: 'validation.book.title.tooLong',
    });
  }

  // Author validation
  if (!data.author || typeof data.author !== 'string') {
    errors.push({
      field: 'author',
      code: 'AUTHOR_REQUIRED',
      message: 'validation.book.author.required',
    });
  } else if (data.author.trim().length === 0) {
    errors.push({
      field: 'author',
      code: 'AUTHOR_EMPTY',
      message: 'validation.book.author.empty',
    });
  } else if (data.author.length > 255) {
    errors.push({
      field: 'author',
      code: 'AUTHOR_TOO_LONG',
      message: 'validation.book.author.tooLong',
    });
  }

  // Status validation
  const validStatuses = ['want-to-read', 'reading', 'paused', 'completed'];
  if (!data.status) {
    errors.push({
      field: 'status',
      code: 'STATUS_REQUIRED',
      message: 'validation.book.status.required',
    });
  } else if (!validStatuses.includes(data.status)) {
    errors.push({
      field: 'status',
      code: 'STATUS_INVALID',
      message: 'validation.book.status.invalid',
    });
  }

  // Optional field validations
  if (data.isbn && typeof data.isbn === 'string') {
    if (data.isbn.length > 20) {
      errors.push({
        field: 'isbn',
        code: 'ISBN_TOO_LONG',
        message: 'validation.book.isbn.tooLong',
      });
    }
    // Basic ISBN format check (10 or 13 digits, optional hyphens)
    const isbnPattern = /^(?:\d{9}[\dXx]|\d{13}|\d{1,5}-\d{1,7}-\d{1,7}-[\dXx]|\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-[\dXx])$/;
    if (!isbnPattern.test(data.isbn.replace(/[-\s]/g, ''))) {
      errors.push({
        field: 'isbn',
        code: 'ISBN_INVALID_FORMAT',
        message: 'validation.book.isbn.invalidFormat',
      });
    }
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 2000) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_TOO_LONG',
      message: 'validation.book.description.tooLong',
    });
  }

  if (data.pageCount !== undefined) {
    if (typeof data.pageCount !== 'number' || !Number.isInteger(data.pageCount)) {
      errors.push({
        field: 'pageCount',
        code: 'PAGE_COUNT_INVALID',
        message: 'validation.book.pageCount.invalid',
      });
    } else if (data.pageCount < 1 || data.pageCount > 50000) {
      errors.push({
        field: 'pageCount',
        code: 'PAGE_COUNT_OUT_OF_RANGE',
        message: 'validation.book.pageCount.outOfRange',
      });
    }
  }

  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number') {
      errors.push({
        field: 'rating',
        code: 'RATING_INVALID',
        message: 'validation.book.rating.invalid',
      });
    } else if (data.rating < 1 || data.rating > 5) {
      errors.push({
        field: 'rating',
        code: 'RATING_OUT_OF_RANGE',
        message: 'validation.book.rating.outOfRange',
      });
    }
  }

  return errors;
}

/**
 * Validate book update payload
 */
export function validateUpdateBook(data: UpdateBookPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // For updates, fields are optional but if provided must be valid
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        code: 'TITLE_INVALID_TYPE',
        message: 'validation.book.title.invalidType',
      });
    } else if (data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        code: 'TITLE_EMPTY',
        message: 'validation.book.title.empty',
      });
    } else if (data.title.length > 255) {
      errors.push({
        field: 'title',
        code: 'TITLE_TOO_LONG',
        message: 'validation.book.title.tooLong',
      });
    }
  }

  if (data.author !== undefined) {
    if (typeof data.author !== 'string') {
      errors.push({
        field: 'author',
        code: 'AUTHOR_INVALID_TYPE',
        message: 'validation.book.author.invalidType',
      });
    } else if (data.author.trim().length === 0) {
      errors.push({
        field: 'author',
        code: 'AUTHOR_EMPTY',
        message: 'validation.book.author.empty',
      });
    } else if (data.author.length > 255) {
      errors.push({
        field: 'author',
        code: 'AUTHOR_TOO_LONG',
        message: 'validation.book.author.tooLong',
      });
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['want-to-read', 'reading', 'paused', 'completed'];
    if (!validStatuses.includes(data.status)) {
      errors.push({
        field: 'status',
        code: 'STATUS_INVALID',
        message: 'validation.book.status.invalid',
      });
    }
  }

  // Same optional validations as create
  if (data.isbn !== undefined && typeof data.isbn === 'string') {
    if (data.isbn.length > 20) {
      errors.push({
        field: 'isbn',
        code: 'ISBN_TOO_LONG',
        message: 'validation.book.isbn.tooLong',
      });
    }
    const isbnPattern = /^(?:\d{9}[\dXx]|\d{13}|\d{1,5}-\d{1,7}-\d{1,7}-[\dXx]|\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-[\dXx])$/;
    if (data.isbn.trim() !== '' && !isbnPattern.test(data.isbn.replace(/[-\s]/g, ''))) {
      errors.push({
        field: 'isbn',
        code: 'ISBN_INVALID_FORMAT',
        message: 'validation.book.isbn.invalidFormat',
      });
    }
  }

  if (data.description !== undefined && typeof data.description === 'string' && data.description.length > 2000) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_TOO_LONG',
      message: 'validation.book.description.tooLong',
    });
  }

  if (data.pageCount !== undefined) {
    if (typeof data.pageCount !== 'number' || !Number.isInteger(data.pageCount)) {
      errors.push({
        field: 'pageCount',
        code: 'PAGE_COUNT_INVALID',
        message: 'validation.book.pageCount.invalid',
      });
    } else if (data.pageCount < 1 || data.pageCount > 50000) {
      errors.push({
        field: 'pageCount',
        code: 'PAGE_COUNT_OUT_OF_RANGE',
        message: 'validation.book.pageCount.outOfRange',
      });
    }
  }

  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number') {
      errors.push({
        field: 'rating',
        code: 'RATING_INVALID',
        message: 'validation.book.rating.invalid',
      });
    } else if (data.rating < 1 || data.rating > 5) {
      errors.push({
        field: 'rating',
        code: 'RATING_OUT_OF_RANGE',
        message: 'validation.book.rating.outOfRange',
      });
    }
  }

  return errors;
}

/**
 * Validate and throw if errors found
 */
export function validateCreateBookAndThrow(data: CreateBookPayload): void {
  const errors = validateCreateBook(data);
  if (errors.length > 0) {
    throw new BookValidationError(errors);
  }
}

export function validateUpdateBookAndThrow(data: UpdateBookPayload): void {
  const errors = validateUpdateBook(data);
  if (errors.length > 0) {
    throw new BookValidationError(errors);
  }
}

/**
 * Check if object has any properties (for update validation)
 */
export function hasUpdateFields(data: UpdateBookPayload): boolean {
  return Object.keys(data).length > 0;
}