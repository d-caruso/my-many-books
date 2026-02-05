'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mobile_hook_action_executions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
        comment: 'Primary key',
      },
      mobile_analytics_event_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        comment: 'Reference to mobile_analytics_events table',
        references: {
          model: 'mobile_analytics_events',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      action_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Action type executed (email/slack/webhook/database/etc)',
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'skipped'),
        allowNull: false,
        comment: 'Execution status',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if failed',
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Optional execution details (response, metadata, etc)',
      },
      execution_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'How long execution took',
      },
      executed_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'When the action was executed',
      },
    });

    // Indexes for monitoring + analytics queries
    await queryInterface.addIndex('mobile_hook_action_executions', ['mobile_analytics_event_id'], {
      name: 'idx_mobile_hook_action_exec_event_id',
    });
    await queryInterface.addIndex('mobile_hook_action_executions', ['action_type'], {
      name: 'idx_mobile_hook_action_exec_action_type',
    });
    await queryInterface.addIndex('mobile_hook_action_executions', ['status'], {
      name: 'idx_mobile_hook_action_exec_status',
    });
    await queryInterface.addIndex('mobile_hook_action_executions', ['executed_at'], {
      name: 'idx_mobile_hook_action_exec_executed_at',
    });
    await queryInterface.addIndex('mobile_hook_action_executions', ['action_type', 'executed_at'], {
      name: 'idx_mobile_hook_action_exec_action_time',
    });
    await queryInterface.addIndex(
      'mobile_hook_action_executions',
      ['mobile_analytics_event_id', 'executed_at'],
      {
        name: 'idx_mobile_hook_action_exec_event_time',
      }
    );
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('mobile_hook_action_executions');
  },
};

