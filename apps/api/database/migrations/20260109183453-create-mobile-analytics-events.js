'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mobile_analytics_events', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      event_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      event_type: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '{}'
      },
      app_version: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      device_info: {
        type: Sequelize.JSON,
        allowNull: true
      },
      processing_status: {
        type: Sequelize.ENUM('pending', 'processed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      processing_error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      creation_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      update_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for better query performance
    await queryInterface.addIndex('mobile_analytics_events', ['event_type']);
    await queryInterface.addIndex('mobile_analytics_events', ['user_id']);
    await queryInterface.addIndex('mobile_analytics_events', ['timestamp']);
    await queryInterface.addIndex('mobile_analytics_events', ['processing_status']);
    await queryInterface.addIndex('mobile_analytics_events', ['creation_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mobile_analytics_events');
  }
};