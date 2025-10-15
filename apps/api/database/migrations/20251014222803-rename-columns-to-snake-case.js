'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Books table
    await queryInterface.renameColumn('books', 'isbnCode', 'isbn_code');
    await queryInterface.renameColumn('books', 'editionNumber', 'edition_number');
    await queryInterface.renameColumn('books', 'editionDate', 'edition_date');
    await queryInterface.renameColumn('books', 'creationDate', 'creation_date');
    await queryInterface.renameColumn('books', 'updateDate', 'update_date');

    // Authors table
    await queryInterface.renameColumn('authors', 'creationDate', 'creation_date');
    await queryInterface.renameColumn('authors', 'updateDate', 'update_date');

    // Categories table
    await queryInterface.renameColumn('categories', 'creationDate', 'creation_date');
    await queryInterface.renameColumn('categories', 'updateDate', 'update_date');

    // BookAuthors junction table
    await queryInterface.renameColumn('book_authors', 'bookId', 'book_id');
    await queryInterface.renameColumn('book_authors', 'authorId', 'author_id');
    await queryInterface.renameColumn('book_authors', 'creationDate', 'creation_date');
    await queryInterface.renameColumn('book_authors', 'updateDate', 'update_date');

    // BookCategories junction table
    await queryInterface.renameColumn('book_categories', 'bookId', 'book_id');
    await queryInterface.renameColumn('book_categories', 'categoryId', 'category_id');
    await queryInterface.renameColumn('book_categories', 'creationDate', 'creation_date');
    await queryInterface.renameColumn('book_categories', 'updateDate', 'update_date');
  },

  async down (queryInterface, Sequelize) {
    // Reverse all column renames

    // Books table
    await queryInterface.renameColumn('books', 'isbn_code', 'isbnCode');
    await queryInterface.renameColumn('books', 'edition_number', 'editionNumber');
    await queryInterface.renameColumn('books', 'edition_date', 'editionDate');
    await queryInterface.renameColumn('books', 'creation_date', 'creationDate');
    await queryInterface.renameColumn('books', 'update_date', 'updateDate');

    // Authors table
    await queryInterface.renameColumn('authors', 'creation_date', 'creationDate');
    await queryInterface.renameColumn('authors', 'update_date', 'updateDate');

    // Categories table
    await queryInterface.renameColumn('categories', 'creation_date', 'creationDate');
    await queryInterface.renameColumn('categories', 'update_date', 'updateDate');

    // BookAuthors junction table
    await queryInterface.renameColumn('book_authors', 'book_id', 'bookId');
    await queryInterface.renameColumn('book_authors', 'author_id', 'authorId');
    await queryInterface.renameColumn('book_authors', 'creation_date', 'creationDate');
    await queryInterface.renameColumn('book_authors', 'update_date', 'updateDate');

    // BookCategories junction table
    await queryInterface.renameColumn('book_categories', 'book_id', 'bookId');
    await queryInterface.renameColumn('book_categories', 'category_id', 'categoryId');
    await queryInterface.renameColumn('book_categories', 'creation_date', 'creationDate');
    await queryInterface.renameColumn('book_categories', 'update_date', 'updateDate');
  }
};
