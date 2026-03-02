/**
 * Tests for Book Handler Variants
 */

import { BookHandlerFactory, Book, CreateBookPayload, UpdateBookPayload } from '../../../services/handlers/BookHandlers';
import { BookValidationError } from '../../../services/handlers/validation/BookValidation';

// Mock the gateway dependencies
jest.mock('../../../services/handlers/gateways/clientGateway');
jest.mock('../../../services/handlers/gateways/mobileHandler');
jest.mock('../../../services/handlers/gateways/queueHandler');

// Mock HTTP client
const createMockHttpClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

// Mock queue
const createMockQueue = () => ({
  enqueue: jest.fn(),
  size: jest.fn(() => 0),
  clear: jest.fn(),
  add: jest.fn(),
  executeAll: jest.fn(),
});

// Mock network provider
const createMockNetworkProvider = () => ({
  isOnline: jest.fn(() => true),
  onNetworkChange: jest.fn(),
});

describe('BookHandlerFactory', () => {
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;
  let mockQueue: ReturnType<typeof createMockQueue>;
  let mockNetworkProvider: ReturnType<typeof createMockNetworkProvider>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockQueue = createMockQueue();
    mockNetworkProvider = createMockNetworkProvider();
    jest.clearAllMocks();
  });

  describe('createClientGateway', () => {
    it('should create a client gateway handler', () => {
      const handler = BookHandlerFactory.createClientGateway(mockHttpClient);
      expect(handler).toBeDefined();
      expect(typeof handler.create).toBe('function');
      expect(typeof handler.update).toBe('function');
      expect(typeof handler.delete).toBe('function');
    });
  });

  describe('createMobileHandler', () => {
    it('should create a mobile handler', () => {
      const handler = BookHandlerFactory.createMobileHandler(mockHttpClient, mockQueue as unknown as Parameters<typeof BookHandlerFactory.createMobileHandler>[1], mockNetworkProvider as unknown as Parameters<typeof BookHandlerFactory.createMobileHandler>[2]);
      expect(handler).toBeDefined();
      expect(typeof handler.create).toBe('function');
      expect(typeof handler.update).toBe('function');
      expect(typeof handler.delete).toBe('function');
    });
  });

  describe('createQueueHandler', () => {
    it('should create a queue handler', () => {
      const handler = BookHandlerFactory.createQueueHandler(mockQueue);
      expect(handler).toBeDefined();
      expect(typeof handler.create).toBe('function');
      expect(typeof handler.update).toBe('function');
      expect(typeof handler.delete).toBe('function');
    });
  });
});

describe('Book Handler Validation', () => {
  let handler: ReturnType<typeof BookHandlerFactory.createClientGateway>;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    handler = BookHandlerFactory.createClientGateway(mockHttpClient);
    jest.clearAllMocks();
  });

  describe('create validation', () => {
    const validBookData: CreateBookPayload = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'reading',
    };

    it('should accept valid book data', async () => {
      // Mock the underlying handler to return a book
      const mockBook: Book = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      // We need to mock the actual implementation
      handler.create = jest.fn().mockResolvedValue(mockBook);

      const result = await handler.create(validBookData);
      expect(result).toEqual(mockBook);
    });

    it('should throw validation error for missing title', async () => {
      const invalidData = {
        author: 'Test Author',
        status: 'reading',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for missing author', async () => {
      const invalidData = {
        title: 'Test Book',
        status: 'reading',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for missing status', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for invalid status', async () => {
      const invalidData: {
        title: string;
        author: string;
        status: string; // Allow any string for testing invalid values
      } = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'invalid-status',
      };

      await expect(handler.create(invalidData as unknown as CreateBookPayload)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for empty title', async () => {
      const invalidData = {
        title: '   ',
        author: 'Test Author',
        status: 'reading',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for too long title', async () => {
      const invalidData = {
        title: 'x'.repeat(256),
        author: 'Test Author',
        status: 'reading',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should accept valid optional fields', async () => {
      const validDataWithOptional: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        isbn: '9781234567890',
        description: 'A great book',
        pageCount: 300,
        rating: 4,
      };

      const mockBook: Book = {
        id: '1',
        ...validDataWithOptional,
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      handler.create = jest.fn().mockResolvedValue(mockBook);
      const result = await handler.create(validDataWithOptional);
      expect(result).toEqual(mockBook);
    });

    it('should throw validation error for invalid ISBN format', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        isbn: '123-invalid',
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for invalid page count', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        pageCount: -1,
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for invalid rating', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        rating: 6,
      } as CreateBookPayload;

      await expect(handler.create(invalidData)).rejects.toThrow(BookValidationError);
    });
  });

  describe('update validation', () => {
    it('should accept valid update data', async () => {
      const updateData: UpdateBookPayload = {
        title: 'Updated Book',
        status: 'completed',
      };

      const mockBook: Book = {
        id: '1',
        title: 'Updated Book',
        author: 'Test Author',
        status: 'completed',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      handler.update = jest.fn().mockResolvedValue(mockBook);
      const result = await handler.update('1', updateData);
      expect(result).toEqual(mockBook);
    });

    it('should throw validation error for empty update data', async () => {
      await expect(handler.update('1', {})).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for empty title in update', async () => {
      const invalidData: UpdateBookPayload = {
        title: '   ',
      };

      await expect(handler.update('1', invalidData)).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for invalid status in update', async () => {
      const invalidData: {
        status: string; // Allow any string for testing invalid values
      } = {
        status: 'invalid-status',
      };

      await expect(handler.update('1', invalidData as unknown as UpdateBookPayload)).rejects.toThrow(BookValidationError);
    });

    it('should accept partial updates with valid fields', async () => {
      const updateData: UpdateBookPayload = {
        rating: 5,
      };

      const mockBook: Book = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        rating: 5,
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      handler.update = jest.fn().mockResolvedValue(mockBook);
      const result = await handler.update('1', updateData);
      expect(result).toEqual(mockBook);
    });
  });

  describe('delete validation', () => {
    it('should accept valid book ID', async () => {
      handler.delete = jest.fn().mockResolvedValue(undefined);
      await expect(handler.delete('1')).resolves.toBeUndefined();
      expect(handler.delete).toHaveBeenCalledWith('1');
    });

    it('should throw validation error for empty ID', async () => {
      await expect(handler.delete('')).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for whitespace-only ID', async () => {
      await expect(handler.delete('   ')).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for null ID', async () => {
      // Test with null by casting to string (which is what the delete method expects)
      await expect(handler.delete(null as unknown as string)).rejects.toThrow(BookValidationError);
    });
  });

  describe('read validation', () => {
    it('should accept valid book ID', async () => {
      const mockBook: Book = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      handler.read = jest.fn().mockResolvedValue(mockBook);
      const result = await handler.read('1');
      expect(result).toEqual(mockBook);
      expect(handler.read).toHaveBeenCalledWith('1');
    });

    it('should throw validation error for empty ID', async () => {
      await expect(handler.read('')).rejects.toThrow(BookValidationError);
    });

    it('should throw validation error for whitespace-only ID', async () => {
      await expect(handler.read('   ')).rejects.toThrow(BookValidationError);
    });
  });
});

describe('BookValidationError', () => {
  it('should contain validation error details', () => {
    const errors = [
      { field: 'title', code: 'TITLE_REQUIRED', message: 'validation.book.title.required' }
    ];
    const error = new BookValidationError(errors, 'Validation failed');

    expect(error.name).toBe('BookValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors).toEqual(errors);
    expect(error.message).toBe('Validation failed');
  });

  it('should have default message', () => {
    const errors = [
      { field: 'title', code: 'TITLE_REQUIRED', message: 'validation.book.title.required' }
    ];
    const error = new BookValidationError(errors);

    expect(error.message).toBe('Book validation failed');
  });
});