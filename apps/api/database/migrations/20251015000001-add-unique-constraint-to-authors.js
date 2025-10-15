'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the old non-unique index
    await queryInterface.removeIndex('authors', 'idx_author_name_surname');

    // Add unique constraint on name and surname
    await queryInterface.addIndex('authors', ['name', 'surname'], {
      name: 'idx_author_name_surname',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique index
    await queryInterface.removeIndex('authors', 'idx_author_name_surname');

    // Restore the old non-unique index
    await queryInterface.addIndex('authors', ['name', 'surname'], {
      name: 'idx_author_name_surname'
    });
  }
};
