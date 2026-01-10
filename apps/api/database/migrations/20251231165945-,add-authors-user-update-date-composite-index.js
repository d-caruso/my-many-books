'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('authors', ['user_id', 'update_date'], {
      name: 'idx_authors_user_update_date'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('authors', 'idx_authors_user_update_date');
  }
};
