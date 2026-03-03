'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_auth_identities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      provider_user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email_snapshot: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      creation_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      update_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex(
      'user_auth_identities',
      ['provider', 'provider_user_id'],
      {
        unique: true,
        name: 'idx_user_auth_identities_provider_subject_unique',
      }
    );

    await queryInterface.addIndex('user_auth_identities', ['user_id', 'provider'], {
      unique: true,
      name: 'idx_user_auth_identities_user_provider_unique',
    });

    await queryInterface.addIndex('user_auth_identities', ['user_id'], {
      name: 'idx_user_auth_identities_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_auth_identities');
  },
};
