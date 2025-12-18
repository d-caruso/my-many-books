'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who performed the action',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'User role at time of action'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Action performed (create, update, delete, etc.)'
      },
      resource_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Type of resource affected (book, user, hook, etc.)'
      },
      resource_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'ID of the resource affected'
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional details about the action'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the client (supports IPv6)'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string from the request'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when the audit log was created'
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('audit_logs', ['user_id'], {
      name: 'idx_audit_logs_user_id'
    });

    await queryInterface.addIndex('audit_logs', ['resource_type'], {
      name: 'idx_audit_logs_resource_type'
    });

    await queryInterface.addIndex('audit_logs', ['resource_id'], {
      name: 'idx_audit_logs_resource_id'
    });

    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action'
    });

    await queryInterface.addIndex('audit_logs', ['created_at'], {
      name: 'idx_audit_logs_created_at'
    });

    // Composite index for common queries
    await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id', 'created_at'], {
      name: 'idx_audit_logs_resource_date'
    });

    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
      name: 'idx_audit_logs_user_date'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};
