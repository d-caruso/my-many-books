'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('app_settings', 'created_at', 'creation_date');
    await queryInterface.renameColumn('app_settings', 'updated_at', 'update_date');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('app_settings', 'creation_date', 'created_at');
    await queryInterface.renameColumn('app_settings', 'update_date', 'updated_at');
  }
};
