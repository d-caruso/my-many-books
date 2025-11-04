'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    return queryInterface.bulkInsert('users', [
      {
        email: 'demo@example.com',
        name: 'Demo',
        surname: 'User',
        is_active: true,
        creation_date: now,
        update_date: now
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('users', {
      email: 'demo@example.com'
    }, {});
  }
};
