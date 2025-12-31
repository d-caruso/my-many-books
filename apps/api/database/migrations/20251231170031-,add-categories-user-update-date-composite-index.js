'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('categories', ['user_id', 'update_date'], {
      name: 'idx_categories_user_update_date',
      type: 'BTREE'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('categories', 'idx_categories_user_update_date');
  }
};
