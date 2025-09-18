// ================================================================
// tests/integration/handlers/index.test.ts
// Integration tests for handler exports
// ================================================================

import * as handlers from '../../../src/handlers/index';

describe('Handlers Index Integration', () => {
  describe('Handler exports', () => {
    it('should export all book handlers', () => {
      expect(handlers.createBook).toBeDefined();
      expect(handlers.getBook).toBeDefined();
      expect(handlers.updateBook).toBeDefined();
      expect(handlers.deleteBook).toBeDefined();
      expect(handlers.listBooks).toBeDefined();
      expect(handlers.searchBooksByIsbn).toBeDefined();
      expect(handlers.importBookFromIsbn).toBeDefined();
    });

    it('should export all author handlers', () => {
      expect(handlers.createAuthor).toBeDefined();
      expect(handlers.getAuthor).toBeDefined();
      expect(handlers.updateAuthor).toBeDefined();
      expect(handlers.deleteAuthor).toBeDefined();
      expect(handlers.listAuthors).toBeDefined();
      expect(handlers.getAuthorBooks).toBeDefined();
    });

    it('should export all category handlers', () => {
      expect(handlers.createCategory).toBeDefined();
      expect(handlers.getCategory).toBeDefined();
      expect(handlers.updateCategory).toBeDefined();
      expect(handlers.deleteCategory).toBeDefined();
      expect(handlers.listCategories).toBeDefined();
      expect(handlers.getCategoryBooks).toBeDefined();
    });

    it('should export all ISBN handlers', () => {
      expect(handlers.lookupBook).toBeDefined();
      expect(handlers.batchLookupBooks).toBeDefined();
      expect(handlers.searchByTitle).toBeDefined();
      expect(handlers.getServiceHealth).toBeDefined();
      expect(handlers.getResilienceStats).toBeDefined();
      expect(handlers.resetResilience).toBeDefined();
      expect(handlers.clearCache).toBeDefined();
      expect(handlers.getCacheStats).toBeDefined();
      expect(handlers.addFallbackBook).toBeDefined();
      expect(handlers.validateIsbn).toBeDefined();
      expect(handlers.formatIsbn).toBeDefined();
    });

    it('should export health handlers', () => {
      expect(handlers.healthCheck).toBeDefined();
      expect(handlers.readinessCheck).toBeDefined();
    });

    it('should export all handlers as functions', () => {
      const handlerNames = [
        'createBook', 'getBook', 'updateBook', 'deleteBook', 'listBooks',
        'createAuthor', 'getAuthor', 'updateAuthor', 'deleteAuthor', 'listAuthors',
        'createCategory', 'getCategory', 'updateCategory', 'deleteCategory', 'listCategories',
        'healthCheck', 'readinessCheck',
        'validateIsbn', 'formatIsbn'
      ];

      handlerNames.forEach(name => {
        expect(typeof handlers[name as keyof typeof handlers]).toBe('function');
      });
    });
  });
});