'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hooks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
        comment: 'Primary key'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Human-readable hook name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Hook purpose description'
      },
      event_pattern: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Event pattern to match (**, user.*, book.create.after)'
      },
      action_type: {
        type: Sequelize.ENUM('log', 'email', 'database'),
        allowNull: false,
        comment: 'Action to execute'
      },
      action_config: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Action-specific configuration'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Enable/disable hook'
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Execution order (higher = first)'
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Admin user who created this hook',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      creation_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      update_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('hooks', ['event_pattern'], {
      name: 'idx_hooks_event_pattern'
    });

    await queryInterface.addIndex('hooks', ['is_active'], {
      name: 'idx_hooks_is_active'
    });

    await queryInterface.addIndex('hooks', ['priority'], {
      name: 'idx_hooks_priority'
    });

    await queryInterface.addIndex('hooks', ['created_by'], {
      name: 'idx_hooks_created_by'
    });

    // Composite index for active hooks ordered by priority
    await queryInterface.addIndex('hooks', ['is_active', 'priority'], {
      name: 'idx_hooks_active_priority'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hooks');
  }
};
