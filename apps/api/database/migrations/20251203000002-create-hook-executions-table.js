'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hook_executions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
        comment: 'Primary key'
      },
      hook_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        comment: 'Reference to hooks table',
        references: {
          model: 'hooks',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      event_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Actual event that triggered'
      },
      event_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Event payload'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Execution succeeded or failed'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if failed'
      },
      execution_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'How long execution took'
      },
      executed_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'When the hook was executed'
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('hook_executions', ['hook_id'], {
      name: 'idx_hook_executions_hook_id'
    });

    await queryInterface.addIndex('hook_executions', ['event_name'], {
      name: 'idx_hook_executions_event_name'
    });

    await queryInterface.addIndex('hook_executions', ['executed_at'], {
      name: 'idx_hook_executions_executed_at'
    });

    await queryInterface.addIndex('hook_executions', ['success'], {
      name: 'idx_hook_executions_success'
    });

    // Composite index for querying executions by hook and time
    await queryInterface.addIndex('hook_executions', ['hook_id', 'executed_at'], {
      name: 'idx_hook_executions_hook_time'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hook_executions');
  }
};
