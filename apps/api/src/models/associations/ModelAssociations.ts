// ================================================================
// src/models/associations/ModelAssociations.ts
// ================================================================

import { Sequelize } from 'sequelize';

export interface ModelRegistry {
  User: any;
  Book: any;
  Author: any;
  Category: any;
  BookAuthor: any;
  BookCategory: any;
}

export class ModelAssociations {
  private static models: Partial<ModelRegistry> = {};

  static registerModel(name: keyof ModelRegistry, model: any): void {
    ModelAssociations.models[name] = model;
  }

  static getModel(name: keyof ModelRegistry): any {
    const model = ModelAssociations.models[name];
    if (!model) {
      throw new Error(`Model ${name} is not registered`);
    }
    return model;
  }

  static getAllModels(): Partial<ModelRegistry> {
    return ModelAssociations.models;
  }

  static defineAssociations(): void {
    const { User, Book, Author, Category, BookAuthor, BookCategory } = ModelAssociations.models;

    if (!User || !Book || !Author || !Category || !BookAuthor || !BookCategory) {
      throw new Error('All models must be registered before defining associations');
    }

    // User - Book relationship
    User.hasMany(Book, {
      foreignKey: 'user_id',
      as: 'books',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    Book.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // Book - Author many-to-many relationship
    Book.belongsToMany(Author, {
      through: BookAuthor,
      foreignKey: 'bookId',
      otherKey: 'authorId',
      as: 'authors',
    });

    Author.belongsToMany(Book, {
      through: BookAuthor,
      foreignKey: 'authorId',
      otherKey: 'bookId',
      as: 'books',
    });

    // Book - Category many-to-many relationship
    Book.belongsToMany(Category, {
      through: BookCategory,
      foreignKey: 'bookId',
      otherKey: 'categoryId',
      as: 'categories',
    });

    Category.belongsToMany(Book, {
      through: BookCategory,
      foreignKey: 'categoryId',
      otherKey: 'bookId',
      as: 'books',
    });

    // Direct associations for junction tables
    BookAuthor.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
    BookAuthor.belongsTo(Author, { foreignKey: 'authorId', as: 'author' });

    BookCategory.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
    BookCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

    Book.hasMany(BookAuthor, { foreignKey: 'bookId' });
    Book.hasMany(BookCategory, { foreignKey: 'bookId' });

    Author.hasMany(BookAuthor, { foreignKey: 'authorId' });
    Category.hasMany(BookCategory, { foreignKey: 'categoryId' });

    console.log('Model associations defined successfully');
  }

  static async syncModels(sequelize: Sequelize, force = false): Promise<void> {
    try {
      await sequelize.sync({ force });
      console.log('Database models synchronized successfully');
    } catch (error) {
      console.error('Error synchronizing database models:', error);
      throw error;
    }
  }
}
