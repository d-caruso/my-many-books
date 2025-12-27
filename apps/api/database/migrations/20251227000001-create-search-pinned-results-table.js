'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // RESOURCE_TYPE_VALUES from libs/shared-types/src/constants/resource-types.ts
    // Must be kept in sync with the TypeScript constants
    const RESOURCE_TYPE_VALUES = ['book', 'author', 'category', 'user', 'hook'];

    await queryInterface.createTable('search_pinned_results', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key',
      },
      resource_type: {
        type: Sequelize.ENUM(...RESOURCE_TYPE_VALUES),
        allowNull: false,
        comment: 'Type of resource (book, author, category, etc.)',
      },
      resource_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the resource to pin',
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Display priority (lower number = higher priority, appears first)',
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this pinned result is currently active',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'When the pinned result was created',
      },
      updated_at: {
        allowNull: true,
        type: Sequelize.DATE,
        comment: 'When the pinned result was last modified',
      },
    });

    // Add composite index on resource_type and resource_id for fast lookups
    await queryInterface.addIndex('search_pinned_results', ['resource_type', 'resource_id'], {
      name: 'idx_resource',
    });

    // Add composite index on resource_type, active, and priority for efficient sorting
    await queryInterface.addIndex(
      'search_pinned_results',
      ['resource_type', 'active', 'priority'],
      {
        name: 'idx_priority',
      }
    );

    // Add unique constraint to prevent duplicate resource pins
    await queryInterface.addIndex('search_pinned_results', ['resource_type', 'resource_id'], {
      name: 'idx_unique_resource_pin',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('search_pinned_results');
  },
};
