// ================================================================
// tests/services/dataTransformer.test.ts
// ================================================================

import { DataTransformer } from '@/services/dataTransformer';
import { OpenLibraryBook } from '@/types/openLibrary';

describe('DataTransformer', () => {
  describe('transformBook', () => {
    it('should transform basic book data correctly', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test Book',
        authors: [{ name: 'John Doe' }],
        subjects: ['Fiction', 'Science Fiction'],
        publish_date: '2023',
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.isbnCode).toBe('9780451524935');
      expect(result.title).toBe('Test Book');
      expect(result.authors).toHaveLength(1);
      expect(result.authors[0]!.name).toBe('John');
      expect(result.authors[0]!.surname).toBe('Doe');
      expect(result.categories).toHaveLength(2);
    });

    it('should handle missing title gracefully', () => {
      const olBook: OpenLibraryBook = {
        authors: [{ name: 'Jane Smith' }],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.title).toBe('Unknown Title');
    });

    it('should parse author names correctly', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        authors: [
          { name: 'John Doe' },
          { name: 'Smith, Jane' },
          { name: 'Gabriel García Márquez' },
          { name: 'Cher' },
        ],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.authors).toHaveLength(4);
      expect(result.authors[0]).toEqual({
        name: 'John',
        surname: 'Doe',
        nationality: undefined,
      });
      expect(result.authors[1]).toEqual({
        name: 'Jane',
        surname: 'Smith',
        nationality: undefined,
      });
      expect(result.authors[2]).toEqual({
        name: 'Gabriel García',
        surname: 'Márquez',
        nationality: undefined,
      });
      expect(result.authors[3]).toEqual({
        name: 'Cher',
        surname: '',
        nationality: undefined,
      });
    });

    it('should extract categories from multiple sources', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        subjects: ['Fiction', 'Science Fiction'],
        subject_places: ['New York', 'Mars'],
        subject_times: ['21st century', 'Future'],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.categories).toHaveLength(6);
      expect(result.categories.find(c => c.name === 'Fiction' && c.type === 'subject')).toBeDefined();
      expect(result.categories.find(c => c.name === 'New York' && c.type === 'topic')).toBeDefined();
      expect(result.categories.find(c => c.name === '21st century' && c.type === 'topic')).toBeDefined();
    });

    describe('OpenLibrary payload hardening', () => {
      it('handles subjects as plain strings', () => {
        const result = DataTransformer.transformBook(
          { title: 'Test', subjects: ['Fiction', 'Drama'] },
          '9780140449136'
        );

        expect(result.categories).toEqual([
          { name: 'Fiction', type: 'subject' },
          { name: 'Drama', type: 'subject' },
        ]);
      });

      it('handles subjects as objects with name and url', () => {
        const result = DataTransformer.transformBook(
          {
            title: 'Test',
            subjects: [
              { name: 'Fiction', url: 'https://openlibrary.org/subjects/fiction' },
              { name: 'Drama', url: 'https://openlibrary.org/subjects/drama' },
            ],
          },
          '9780140449136'
        );

        expect(result.categories).toEqual([
          { name: 'Fiction', type: 'subject' },
          { name: 'Drama', type: 'subject' },
        ]);
      });

      it('handles a mixed array of strings and objects', () => {
        const result = DataTransformer.transformBook(
          {
            title: 'Test',
            subjects: ['Fiction', { name: 'Drama', url: 'https://openlibrary.org/subjects/drama' }],
          },
          '9780140449136'
        );

        expect(result.categories).toEqual([
          { name: 'Fiction', type: 'subject' },
          { name: 'Drama', type: 'subject' },
        ]);
      });

      it('does not throw for real ISBN 9780140449136 payload shape', () => {
        expect(() =>
          DataTransformer.transformBook(
            {
              title: 'Test',
              subjects: [
                {
                  name: 'Ancient Greece',
                  url: 'https://openlibrary.org/subjects/ancient_greece',
                },
              ],
              subject_places: [
                {
                  name: 'Greece',
                  url: 'https://openlibrary.org/subjects/place:greece',
                },
              ],
              subject_times: ['Ancient'],
            },
            '9780140449136'
          )
        ).not.toThrow();
      });
    });

    it('should parse edition dates correctly', () => {
      const testCases = [
        { input: '2023', expected: '2023' },
        { input: 'January 15, 2023', expected: '2023-01-15' },
        { input: '2023-03-15', expected: '2023-03-15' },
        { input: 'January 2023', expected: '2023-01' },
        { input: 'invalid date', expected: undefined },
      ];

      testCases.forEach(({ input, expected }) => {
        const olBook: OpenLibraryBook = {
          title: 'Test',
          publish_date: input,
        };

        const result = DataTransformer.transformBook(olBook, '9780451524935');

        if (expected) {
          expect(result.editionDate).toBe(expected);
        } else {
          expect(result.editionDate).toBeUndefined();
        }
      });
    });

    it('should deduplicate categories', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        subjects: ['Fiction', 'fiction', 'FICTION'], // Duplicates with different cases
        subject_places: ['Fiction'], // Different type but same name
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      // Should have 2 categories: Fiction (subject) and Fiction (topic)
      expect(result.categories).toHaveLength(2);
      expect(result.categories.filter(c => c.name === 'Fiction')).toHaveLength(2);
    });

    it('should throw error for invalid ISBN', () => {
      const olBook: OpenLibraryBook = { title: 'Test' };

      expect(() => {
        DataTransformer.transformBook(olBook, 'invalid-isbn');
      }).toThrow('Invalid ISBN provided for transformation');
    });

    it('should extract cover image URLs from OL cover field', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test Book',
        cover: {
          medium: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
          large: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
        },
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.coverImageUrlMedium).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
      expect(result.coverImageUrlLarge).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    });

    it('should set cover URLs to undefined when cover field is absent', () => {
      const olBook: OpenLibraryBook = { title: 'Test Book' };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.coverImageUrlMedium).toBeUndefined();
      expect(result.coverImageUrlLarge).toBeUndefined();
    });
  });
});
