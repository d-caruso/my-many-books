// ================================================================
// src/models/index.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { ModelAssociations } from './associations/ModelAssociations';
import { Author } from './Author';
import { Category } from './Category';
import { Book } from './Book';
import { BookAuthor } from './BookAuthor';
import { BookCategory } from './BookCategory';
import { User } from './User';
import { Hook } from './Hook';
import { HookExecution } from './HookExecution';
import { AuditLog } from './AuditLog';
import { Setting } from './Setting';
import { AppSetting } from './AppSetting';
import { SearchPinnedResult } from './SearchPinnedResult';
import { MobileAnalyticsEvent } from './MobileAnalyticsEvent';
import { MobileHookActionExecution } from './MobileHookActionExecution';
import { getLogger } from '@my-many-books/shared-logging';

export * from './interfaces/ModelInterfaces';
export * from './base/BaseModel';
export * from './associations/ModelAssociations';
export * from './Author';
export * from './Category';
export * from './Book';
export * from './BookAuthor';
export * from './BookCategory';
export * from './User';
export * from './Hook';
export * from './HookExecution';
export * from './AuditLog';
export * from './Setting';
export * from './AppSetting';
export * from './SearchPinnedResult';
export * from './MobileAnalyticsEvent';
export * from './MobileHookActionExecution';

export class ModelManager {
  private static sequelize: Sequelize | null = null;
  private static initialized = false;

  static initialize(sequelize: Sequelize): void {
    if (ModelManager.initialized) {
      return;
    }

    ModelManager.sequelize = sequelize;

    // Initialize models in dependency order
    User.initModel(sequelize);
    Author.initModel(sequelize);
    Category.initModel(sequelize);
    Book.initModel(sequelize);
    BookAuthor.initModel(sequelize);
    BookCategory.initModel(sequelize);
    Hook.initModel(sequelize);
    HookExecution.initModel(sequelize);
    AuditLog.initModel(sequelize);
    Setting.initModel(sequelize);
    AppSetting.initModel(sequelize);
    SearchPinnedResult.initModel(sequelize);
    MobileAnalyticsEvent.initModel(sequelize);
    MobileHookActionExecution.initModel(sequelize);

    // Register models for associations
    ModelAssociations.registerModel('User', User);
    ModelAssociations.registerModel('Author', Author);
    ModelAssociations.registerModel('Category', Category);
    ModelAssociations.registerModel('Book', Book);
    ModelAssociations.registerModel('BookAuthor', BookAuthor);
    ModelAssociations.registerModel('BookCategory', BookCategory);
    ModelAssociations.registerModel('Hook', Hook);
    ModelAssociations.registerModel('HookExecution', HookExecution);
    ModelAssociations.registerModel('AuditLog', AuditLog);
    ModelAssociations.registerModel('Setting', Setting);
    ModelAssociations.registerModel('AppSetting', AppSetting);
    ModelAssociations.registerModel('SearchPinnedResult', SearchPinnedResult);
    ModelAssociations.registerModel('MobileAnalyticsEvent', MobileAnalyticsEvent);
    ModelAssociations.registerModel('MobileHookActionExecution', MobileHookActionExecution);

    // Define associations
    ModelAssociations.defineAssociations();

    ModelManager.initialized = true;
    getLogger().info('Model manager initialized with all models and associations');
  }

  static getSequelize(): Sequelize {
    if (!ModelManager.sequelize) {
      throw new Error('ModelManager not initialized. Call initialize() first.');
    }
    return ModelManager.sequelize;
  }

  static async syncDatabase(force = false): Promise<void> {
    if (!ModelManager.sequelize) {
      throw new Error('ModelManager not initialized');
    }

    await ModelAssociations.syncModels(ModelManager.sequelize, force);
  }

  static isInitialized(): boolean {
    return ModelManager.initialized;
  }

  static async close(): Promise<void> {
    if (ModelManager.sequelize) {
      await ModelManager.sequelize.close();
      ModelManager.sequelize = null;
      ModelManager.initialized = false;
    }
  }

	  static getModels(): {
	    User: typeof User;
	    Author: typeof Author;
	    Category: typeof Category;
	    Book: typeof Book;
	    BookAuthor: typeof BookAuthor;
	    BookCategory: typeof BookCategory;
	    Hook: typeof Hook;
	    HookExecution: typeof HookExecution;
	    AuditLog: typeof AuditLog;
	    Setting: typeof Setting;
	    AppSetting: typeof AppSetting;
	    SearchPinnedResult: typeof SearchPinnedResult;
	    MobileAnalyticsEvent: typeof MobileAnalyticsEvent;
	    MobileHookActionExecution: typeof MobileHookActionExecution;
	  } {
	    return {
	      User,
	      Author,
	      Category,
	      Book,
	      BookAuthor,
	      BookCategory,
	      Hook,
	      HookExecution,
	      AuditLog,
	      Setting,
	      AppSetting,
	      SearchPinnedResult,
	      MobileAnalyticsEvent,
	      MobileHookActionExecution,
	    };
	  }
	}
