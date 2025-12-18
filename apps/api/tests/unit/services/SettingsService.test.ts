import { SettingsService } from '../../../src/services/SettingsService';
import { AppSetting } from '../../../src/models/AppSetting';
import { getAllSettingDefinitions } from '@my-many-books/shared-types';

// Mock AppSetting model
jest.mock('../../../src/models/AppSetting');

// Mock logger
jest.mock('../../../src/services/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock setting definitions
jest.mock('@my-many-books/shared-types', () => ({
  getAllSettingDefinitions: jest.fn(),
}));

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SettingsService.reset();
    // Default mock for getAllSettingDefinitions
    (getAllSettingDefinitions as jest.Mock).mockReturnValue([]);
  });

  describe('initialize', () => {
    it('should initialize service successfully', async () => {
      (AppSetting as any).sequelize = {}; // Mock sequelize
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();

      expect(SettingsService.isInitialized()).toBe(true);
      expect(AppSetting.findAll).toHaveBeenCalled();
    });

    it('should skip if already initialized', async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();
      await SettingsService.initialize(); // Second call

      // Should only call findAll once
      expect(AppSetting.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle missing sequelize gracefully', async () => {
      (AppSetting as any).sequelize = null;

      await SettingsService.initialize();

      expect(SettingsService.isInitialized()).toBe(true);
      expect(AppSetting.findAll).not.toHaveBeenCalled();
    });
  });

  describe('auto-sync', () => {
    beforeEach(() => {
      (AppSetting as any).sequelize = {};
    });

    it('should create new settings from definitions', async () => {
      const mockDefinitions = [
        { key: 'new.setting', category: 'ui', type: 'string', defaultValue: 'test', description: 'Test' }
      ];
      (getAllSettingDefinitions as jest.Mock).mockReturnValue(mockDefinitions);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);
      (AppSetting.create as jest.Mock).mockResolvedValue({});

      await SettingsService.initialize();

      expect(AppSetting.create).toHaveBeenCalledWith(expect.objectContaining({
        key: 'new.setting',
        value: '"test"',
        category: 'ui',
      }));
    });

    it('should restore deleted settings when re-added to definitions', async () => {
      const mockDefinitions = [
        { key: 'restored.setting', category: 'ui', type: 'string', defaultValue: 'test', description: 'Test' }
      ];
      const mockExisting = {
        key: 'restored.setting',
        deleted: true,
        update: jest.fn().mockResolvedValue(true),
      };

      (getAllSettingDefinitions as jest.Mock).mockReturnValue(mockDefinitions);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([mockExisting]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();

      expect(mockExisting.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted: false,
      }));
    });

    it('should mark orphaned settings as deleted', async () => {
      const mockDefinitions = [
        { key: 'active.setting', category: 'ui', type: 'string', defaultValue: 'test', description: 'Test' }
      ];
      const mockOrphaned = {
        key: 'orphaned.setting',
        deleted: false,
        update: jest.fn().mockResolvedValue(true),
      };
      const mockActive = {
        key: 'active.setting',
        update: jest.fn().mockResolvedValue(true),
      };

      (getAllSettingDefinitions as jest.Mock).mockReturnValue(mockDefinitions);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([mockOrphaned, mockActive]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();

      expect(mockOrphaned.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted: true,
      }));
    });
  });

  describe('getSetting', () => {
    beforeEach(async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const mockSetting = {
        key: 'test.setting',
        value: '"testValue"',
        getParsedValue: jest.fn().mockReturnValue('testValue'),
      };

      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([mockSetting]);

      await SettingsService.initialize();
    });

    it('should return parsed value from cache', () => {
      const result = SettingsService.getSetting('test.setting');

      expect(result).toBe('testValue');
    });

    it('should return null for non-existent setting', () => {
      const result = SettingsService.getSetting('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw if not initialized', () => {
      SettingsService.reset();

      expect(() => SettingsService.getSetting('test.setting')).toThrow(
        'SettingsService not initialized'
      );
    });
  });

  describe('getAllSettings', () => {
    beforeEach(async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const mockSettings = [
        { key: 'setting1', value: '"value1"', getParsedValue: jest.fn() },
        { key: 'setting2', value: '"value2"', getParsedValue: jest.fn() },
      ];

      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue(mockSettings);

      await SettingsService.initialize();
    });

    it('should return all cached settings', () => {
      const result = SettingsService.getAllSettings();

      expect(result).toHaveLength(2);
      expect(result[0]?.key).toBe('setting1');
      expect(result[1]?.key).toBe('setting2');
    });

    it('should throw if not initialized', () => {
      SettingsService.reset();

      expect(() => SettingsService.getAllSettings()).toThrow(
        'SettingsService not initialized'
      );
    });
  });

  describe('getAllSettingsAdmin', () => {
    beforeEach(async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();
    });

    it('should return all settings including deleted', async () => {
      const mockSettings = [
        { key: 'setting1', deleted: false },
        { key: 'setting2', deleted: true },
      ];

      (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

      const result = await SettingsService.getAllSettingsAdmin();

      expect(result).toHaveLength(2);
      expect(AppSetting.findAll).toHaveBeenCalledWith({
        order: [['category', 'ASC'], ['key', 'ASC']],
      });
    });

    it('should throw if not initialized', async () => {
      SettingsService.reset();

      await expect(SettingsService.getAllSettingsAdmin()).rejects.toThrow(
        'SettingsService not initialized'
      );
    });
  });

  describe('updateSetting', () => {
    beforeEach(async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();
    });

    it('should update setting value and cache', async () => {
      const mockSetting = {
        key: 'test.setting',
        value: '"oldValue"',
        active: true,
        deleted: false,
        update: jest.fn().mockResolvedValue(true),
      };

      (AppSetting.findByKey as jest.Mock).mockResolvedValue(mockSetting);

      await SettingsService.updateSetting('test.setting', 'newValue');

      expect(mockSetting.update).toHaveBeenCalledWith({
        value: '"newValue"',
      });
      expect(AppSetting.findByKey).toHaveBeenCalledWith('test.setting');
    });

    it('should throw if setting not found', async () => {
      (AppSetting.findByKey as jest.Mock).mockResolvedValue(null);

      await expect(SettingsService.updateSetting('nonexistent', 'value')).rejects.toThrow(
        "Setting with key 'nonexistent' not found"
      );
    });

    it('should throw if setting is deleted', async () => {
      const mockSetting = {
        key: 'test.setting',
        deleted: true,
      };

      (AppSetting.findByKey as jest.Mock).mockResolvedValue(mockSetting);

      await expect(SettingsService.updateSetting('test.setting', 'value')).rejects.toThrow(
        "Cannot update deleted setting 'test.setting'"
      );
    });
  });

  describe('toggleActive', () => {
    beforeEach(async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();
    });

    it('should toggle active status', async () => {
      const mockSetting = {
        key: 'test.setting',
        active: true,
        deleted: false,
        update: jest.fn().mockResolvedValue(true),
      };

      (AppSetting.findByKey as jest.Mock).mockResolvedValue(mockSetting);

      await SettingsService.toggleActive('test.setting', false);

      expect(mockSetting.update).toHaveBeenCalledWith({ active: false });
    });

    it('should throw if setting not found', async () => {
      (AppSetting.findByKey as jest.Mock).mockResolvedValue(null);

      await expect(SettingsService.toggleActive('nonexistent', true)).rejects.toThrow(
        "Setting with key 'nonexistent' not found"
      );
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(SettingsService.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();

      expect(SettingsService.isInitialized()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset service state', async () => {
      (AppSetting as any).sequelize = {};
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findActiveSettings as jest.Mock).mockResolvedValue([]);

      await SettingsService.initialize();
      expect(SettingsService.isInitialized()).toBe(true);

      SettingsService.reset();

      expect(SettingsService.isInitialized()).toBe(false);
    });
  });
});
