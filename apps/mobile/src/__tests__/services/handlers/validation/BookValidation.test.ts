/**
 * Tests for Book Validation
 */

import {
  validateCreateBook,
  validateUpdateBook,
  validateCreateBookAndThrow,
  validateUpdateBookAndThrow,
  hasUpdateFields,
  BookValidationError,
} from '../../../../services/handlers/validation/BookValidation';
import { CreateBookPayload, UpdateBookPayload } from '../../../../services/handlers/BookHandlers';

describe('Book Validation', () => {
  describe('validateCreateBook', () => {
    const validBookData: CreateBookPayload = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'reading',
    };

    it('should return no errors for valid book data', () => {
      const errors = validateCreateBook(validBookData);
      expect(errors).toHaveLength(0);
    });

    describe('title validation', () => {
      it('should require title', () => {
        const data = { ...validBookData };
        delete (data as any).title;
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'title',
            code: 'TITLE_REQUIRED',
            message: 'validation.book.title.required',
          })
        ]);
      });

      it('should reject empty title', () => {
        const data = { ...validBookData, title: '   ' };
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'title',
            code: 'TITLE_EMPTY',
            message: 'validation.book.title.empty',
          })
        ]);
      });

      it('should reject too long title', () => {
        const data = { ...validBookData, title: 'x'.repeat(256) };
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'title',
            code: 'TITLE_TOO_LONG',
            message: 'validation.book.title.tooLong',
          })
        ]);
      });

      it('should accept maximum length title', () => {
        const data = { ...validBookData, title: 'x'.repeat(255) };
        
        const errors = validateCreateBook(data);
        expect(errors.filter(e => e.field === 'title')).toHaveLength(0);
      });
    });

    describe('author validation', () => {
      it('should require author', () => {
        const data = { ...validBookData };
        delete (data as any).author;
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'author',
            code: 'AUTHOR_REQUIRED',
            message: 'validation.book.author.required',
          })
        ]);
      });

      it('should reject empty author', () => {
        const data = { ...validBookData, author: '   ' };
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'author',
            code: 'AUTHOR_EMPTY',
            message: 'validation.book.author.empty',
          })
        ]);
      });

      it('should reject too long author', () => {
        const data = { ...validBookData, author: 'x'.repeat(256) };
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'author',
            code: 'AUTHOR_TOO_LONG',
            message: 'validation.book.author.tooLong',
          })
        ]);
      });
    });

    describe('status validation', () => {
      it('should require status', () => {
        const data = { ...validBookData };
        delete (data as any).status;
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'status',
            code: 'STATUS_REQUIRED',
            message: 'validation.book.status.required',
          })
        ]);
      });

      it('should reject invalid status', () => {
        const data = { ...validBookData, status: 'invalid-status' as any };
        
        const errors = validateCreateBook(data);
        expect(errors).toEqual([
          expect.objectContaining({
            field: 'status',
            code: 'STATUS_INVALID',
            message: 'validation.book.status.invalid',
          })
        ]);
      });

      it('should accept all valid statuses', () => {
        const validStatuses = ['want-to-read', 'reading', 'paused', 'completed'] as const;
        
        for (const status of validStatuses) {
          const data = { ...validBookData, status };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'status')).toHaveLength(0);
        }
      });
    });

    describe('optional fields validation', () => {
      describe('ISBN validation', () => {
        it('should accept valid 10-digit ISBN', () => {
          const data = { ...validBookData, isbn: '0123456789' };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'isbn')).toHaveLength(0);
        });

        it('should accept valid 13-digit ISBN', () => {
          const data = { ...validBookData, isbn: '9780123456789' };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'isbn')).toHaveLength(0);
        });

        it('should accept ISBN with hyphens', () => {
          const data = { ...validBookData, isbn: '978-0-123-45678-9' };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'isbn')).toHaveLength(0);
        });

        it('should reject invalid ISBN format', () => {
          const data = { ...validBookData, isbn: '123-invalid' };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'isbn',
              code: 'ISBN_INVALID_FORMAT',
              message: 'validation.book.isbn.invalidFormat',
            })
          ]);
        });

        it('should reject too long ISBN', () => {
          const data = { ...validBookData, isbn: 'x'.repeat(21) };
          const errors = validateCreateBook(data);
          expect(errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'isbn',
                code: 'ISBN_TOO_LONG',
                message: 'validation.book.isbn.tooLong',
              })
            ])
          );
        });
      });

      describe('description validation', () => {
        it('should accept valid description', () => {
          const data = { ...validBookData, description: 'A great book about testing' };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'description')).toHaveLength(0);
        });

        it('should reject too long description', () => {
          const data = { ...validBookData, description: 'x'.repeat(2001) };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'description',
              code: 'DESCRIPTION_TOO_LONG',
              message: 'validation.book.description.tooLong',
            })
          ]);
        });
      });

      describe('page count validation', () => {
        it('should accept valid page count', () => {
          const data = { ...validBookData, pageCount: 300 };
          const errors = validateCreateBook(data);
          expect(errors.filter(e => e.field === 'pageCount')).toHaveLength(0);
        });

        it('should reject non-integer page count', () => {
          const data = { ...validBookData, pageCount: 3.14 };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'pageCount',
              code: 'PAGE_COUNT_INVALID',
              message: 'validation.book.pageCount.invalid',
            })
          ]);
        });

        it('should reject negative page count', () => {
          const data = { ...validBookData, pageCount: -1 };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'pageCount',
              code: 'PAGE_COUNT_OUT_OF_RANGE',
              message: 'validation.book.pageCount.outOfRange',
            })
          ]);
        });

        it('should reject too high page count', () => {
          const data = { ...validBookData, pageCount: 50001 };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'pageCount',
              code: 'PAGE_COUNT_OUT_OF_RANGE',
              message: 'validation.book.pageCount.outOfRange',
            })
          ]);
        });
      });

      describe('rating validation', () => {
        it('should accept valid ratings', () => {
          for (const rating of [1, 2, 3, 4, 5]) {
            const data = { ...validBookData, rating };
            const errors = validateCreateBook(data);
            expect(errors.filter(e => e.field === 'rating')).toHaveLength(0);
          }
        });

        it('should reject non-numeric rating', () => {
          const data = { ...validBookData, rating: 'five' as any };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'rating',
              code: 'RATING_INVALID',
              message: 'validation.book.rating.invalid',
            })
          ]);
        });

        it('should reject rating below 1', () => {
          const data = { ...validBookData, rating: 0 };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'rating',
              code: 'RATING_OUT_OF_RANGE',
              message: 'validation.book.rating.outOfRange',
            })
          ]);
        });

        it('should reject rating above 5', () => {
          const data = { ...validBookData, rating: 6 };
          const errors = validateCreateBook(data);
          expect(errors).toEqual([
            expect.objectContaining({
              field: 'rating',
              code: 'RATING_OUT_OF_RANGE',
              message: 'validation.book.rating.outOfRange',
            })
          ]);
        });
      });
    });

    it('should collect multiple validation errors', () => {
      const invalidData = {
        title: '',
        author: '',
        status: 'invalid' as any,
        isbn: 'invalid-isbn',
        rating: 10,
      };
      
      const errors = validateCreateBook(invalidData);
      expect(errors).toHaveLength(5);
      expect(errors.map(e => e.field).sort()).toEqual(['author', 'isbn', 'rating', 'status', 'title']);
    });
  });

  describe('validateUpdateBook', () => {
    it('should return no errors for valid update data', () => {
      const updateData: UpdateBookPayload = {
        title: 'Updated Title',
        status: 'completed',
      };
      
      const errors = validateUpdateBook(updateData);
      expect(errors).toHaveLength(0);
    });

    it('should accept empty update data (will be caught by hasUpdateFields)', () => {
      const errors = validateUpdateBook({});
      expect(errors).toHaveLength(0);
    });

    it('should validate provided fields', () => {
      const invalidData: UpdateBookPayload = {
        title: '',
        status: 'invalid' as any,
        rating: 10,
      };
      
      const errors = validateUpdateBook(invalidData);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.field).sort()).toEqual(['rating', 'status', 'title']);
    });

    it('should allow undefined fields', () => {
      const updateData: UpdateBookPayload = {
        title: undefined,
        author: 'Valid Author',
        status: undefined,
      };
      
      const errors = validateUpdateBook(updateData);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateCreateBookAndThrow', () => {
    it('should not throw for valid data', () => {
      const validData: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      };
      
      expect(() => validateCreateBookAndThrow(validData)).not.toThrow();
    });

    it('should throw BookValidationError for invalid data', () => {
      const invalidData = {
        title: '',
        author: 'Test Author',
        status: 'reading',
      } as CreateBookPayload;
      
      expect(() => validateCreateBookAndThrow(invalidData)).toThrow(BookValidationError);
    });

    it('should include validation errors in thrown exception', () => {
      const invalidData = {
        title: '',
        author: '',
        status: 'reading',
      } as CreateBookPayload;
      
      try {
        validateCreateBookAndThrow(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(BookValidationError);
        expect((error as BookValidationError).errors).toHaveLength(2);
      }
    });
  });

  describe('validateUpdateBookAndThrow', () => {
    it('should not throw for valid data', () => {
      const validData: UpdateBookPayload = {
        title: 'Updated Title',
      };
      
      expect(() => validateUpdateBookAndThrow(validData)).not.toThrow();
    });

    it('should throw BookValidationError for invalid data', () => {
      const invalidData: UpdateBookPayload = {
        title: '',
      };
      
      expect(() => validateUpdateBookAndThrow(invalidData)).toThrow(BookValidationError);
    });
  });

  describe('hasUpdateFields', () => {
    it('should return true for object with properties', () => {
      expect(hasUpdateFields({ title: 'Test' })).toBe(true);
      expect(hasUpdateFields({ title: '', author: 'Test' })).toBe(true);
    });

    it('should return false for empty object', () => {
      expect(hasUpdateFields({})).toBe(false);
    });

    it('should return true for object with undefined values', () => {
      expect(hasUpdateFields({ title: undefined })).toBe(true);
    });
  });
});