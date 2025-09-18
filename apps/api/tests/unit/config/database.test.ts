// ================================================================
// tests/config/database.test.ts
// ================================================================

import { Sequelize } from 'sequelize';
import DatabaseConnection from '../../../src/config/database';
import { DATABASE_CONFIG } from '../../../src/utils/constants';

// Mock Sequelize
jest.mock('sequelize');
const MockSequelize = Sequelize as jest.MockedClass<typeof Sequelize> & {
  mock: {
    calls: any[][];
  };
};

describe('DatabaseConnection', () => {
  let mockSequelize: jest.Mocked<Sequelize>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_NAME'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASSWORD'];
    delete process.env['DB_SSL'];
    delete process.env['NODE_ENV'];

    // Reset singleton instance
    (DatabaseConnection as any).instance = null;

    mockSequelize = {
      authenticate: jest.fn(),
      close: jest.fn(),
    } as any;

    MockSequelize.mockImplementation(() => mockSequelize);
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      // Set required env vars
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';

      const instance1 = DatabaseConnection.getInstance();
      const instance2 = DatabaseConnection.getInstance();

      expect(instance1).toBe(instance2);
      expect(MockSequelize).toHaveBeenCalledTimes(1);
    });

    it('should create connection with required environment variables', () => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';

      DatabaseConnection.getInstance();

      expect(MockSequelize).toHaveBeenCalledWith('testdb', 'testuser', 'testpass', {
        host: 'localhost',
        port: 3306,
        dialect: DATABASE_CONFIG.DIALECT,
        timezone: DATABASE_CONFIG.TIMEZONE,
        pool: DATABASE_CONFIG.POOL,
        dialectOptions: {
          ssl: false,
        },
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          createdAt: 'creation_date',
          updatedAt: 'update_date',
        },
      });
    });

    it('should use custom port when provided', () => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_PORT'] = '5432';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';

      DatabaseConnection.getInstance();

      expect(MockSequelize).toHaveBeenCalledWith('testdb', 'testuser', 'testpass', 
        expect.objectContaining({
          port: 5432,
        })
      );
    });

    it('should enable SSL when DB_SSL is true', () => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';
      process.env['DB_SSL'] = 'true';

      DatabaseConnection.getInstance();

      expect(MockSequelize).toHaveBeenCalledWith('testdb', 'testuser', 'testpass', 
        expect.objectContaining({
          dialectOptions: {
            ssl: { rejectUnauthorized: false },
          },
        })
      );
    });

    it('should enable logging in development mode', () => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';
      process.env['NODE_ENV'] = 'development';

      DatabaseConnection.getInstance();

      // Sequelize constructor: new Sequelize(database, username, password, options)
      expect(MockSequelize).toHaveBeenCalled();
      
      // Check that MockSequelize was called with proper arguments including logging function
      const call = (MockSequelize as any).mock.calls[0];
      expect(call).toBeDefined();
      expect(call.length).toBe(4); // database, username, password, options
      
      const [database, username, password, options] = call;
      expect(database).toBe('testdb');
      expect(username).toBe('testuser');  
      expect(password).toBe('testpass');
      expect(typeof options.logging).toBe('function');
    });

    it('should throw error when required environment variables are missing', () => {
      expect(() => DatabaseConnection.getInstance()).toThrow('Missing required database environment variables');
    });

    it('should throw error when DB_HOST is missing', () => {
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';

      expect(() => DatabaseConnection.getInstance()).toThrow('Missing required database environment variables');
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';
    });

    it('should return true when connection is successful', async () => {
      mockSequelize.authenticate.mockResolvedValue();

      const result = await DatabaseConnection.testConnection();

      expect(result).toBe(true);
      expect(mockSequelize.authenticate).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockSequelize.authenticate.mockRejectedValue(new Error('Connection failed'));

      const result = await DatabaseConnection.testConnection();

      expect(result).toBe(false);
      expect(mockSequelize.authenticate).toHaveBeenCalled();
    });
  });

  describe('closeConnection', () => {
    beforeEach(() => {
      process.env['DB_HOST'] = 'localhost';
      process.env['DB_NAME'] = 'testdb';
      process.env['DB_USER'] = 'testuser';
      process.env['DB_PASSWORD'] = 'testpass';
    });

    it('should close connection when instance exists', async () => {
      // Create instance first
      DatabaseConnection.getInstance();
      mockSequelize.close.mockResolvedValue();

      await DatabaseConnection.closeConnection();

      expect(mockSequelize.close).toHaveBeenCalled();
      expect((DatabaseConnection as any).instance).toBeNull();
    });

    it('should do nothing when no instance exists', async () => {
      await DatabaseConnection.closeConnection();

      expect(mockSequelize.close).not.toHaveBeenCalled();
    });
  });
});
