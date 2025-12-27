'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add FULLTEXT index to books table for title and notes columns
    // This enables MySQL FULLTEXT search with MATCH...AGAINST queries
    await queryInterface.sequelize.query(
      'CREATE FULLTEXT INDEX idx_books_fulltext ON books(title, notes)'
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove FULLTEXT index
    await queryInterface.removeIndex('books', 'idx_books_fulltext');
  },
};
