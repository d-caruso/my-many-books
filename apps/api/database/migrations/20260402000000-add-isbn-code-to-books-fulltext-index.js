'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('books', 'idx_books_fulltext');
    await queryInterface.sequelize.query(
      'CREATE FULLTEXT INDEX idx_books_fulltext ON books(title, notes, isbn_code)'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('books', 'idx_books_fulltext');
    await queryInterface.sequelize.query(
      'CREATE FULLTEXT INDEX idx_books_fulltext ON books(title, notes)'
    );
  },
};
