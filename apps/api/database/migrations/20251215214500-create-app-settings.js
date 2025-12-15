'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('app_settings', {
      key: {
        type: Sequelize.STRING(100),
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'enum', 'json'),
        allowNull: false
      },
      defaultValue: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'default_value'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'deleted_at'
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_synced_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add index for querying active, non-deleted settings
    await queryInterface.addIndex('app_settings', ['active', 'deleted'], {
      name: 'idx_app_settings_active_deleted'
    });

    // Add index for category (for grouping in admin UI)
    await queryInterface.addIndex('app_settings', ['category'], {
      name: 'idx_app_settings_category'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('app_settings');
  }
};
