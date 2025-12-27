'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add FULLTEXT index to authors table for name and surname columns
    // This enables MySQL FULLTEXT search with MATCH...AGAINST queries
    await queryInterface.sequelize.query(
      'CREATE FULLTEXT INDEX idx_authors_fulltext ON authors(name, surname)'
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove FULLTEXT index
    await queryInterface.removeIndex('authors', 'idx_authors_fulltext');
  },
};
