'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key',
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Setting key (unique identifier)',
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Setting value (stored as string)',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable description of the setting',
      },
      creation_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'When the setting was created',
      },
      update_date: {
        allowNull: true,
        type: Sequelize.DATE,
        comment: 'When the setting was last modified',
      },
    });

    // Add index on key for fast lookups
    await queryInterface.addIndex('settings', ['key'], {
      name: 'idx_settings_key',
      unique: true,
    });

    // Insert default audit_logging_enabled setting
    await queryInterface.bulkInsert('settings', [
      {
        key: 'audit_logging_enabled',
        value: 'true',
        description: 'Enable or disable audit logging (true/false)',
        creation_date: new Date(),
        update_date: null,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('settings');
  },
};
