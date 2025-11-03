'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add role column to users table
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'user'
    });

    // Add index for role
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('users', 'idx_users_role');

    // Remove the column
    await queryInterface.removeColumn('users', 'role');
  }
};
