'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    const books = await queryInterface.bulkInsert('books', [
      {
        isbn_code: '9780451524935',
        title: '1984',
        edition_number: 1,
        edition_date: '1949-06-08',
        status: 'available',
        notes: 'A powerful dystopian novel about totalitarianism and surveillance',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780486284736',
        title: 'Pride and Prejudice',
        edition_number: 1,
        edition_date: '1813-01-28',
        status: 'reading',
        notes: 'Classic romance novel with wit and social commentary',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780486400778',
        title: 'The Adventures of Huckleberry Finn',
        edition_number: 1,
        edition_date: '1884-12-10',
        status: 'available',
        notes: 'American classic about friendship and adventure along the Mississippi',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780060883287',
        title: 'One Hundred Years of Solitude',
        edition_number: 1,
        edition_date: '1967-06-05',
        status: 'wishlist',
        notes: 'Magical realism masterpiece about the Buendía family',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780156907392',
        title: 'To the Lighthouse',
        edition_number: 1,
        edition_date: '1927-05-05',
        status: 'available',
        notes: 'Modernist novel exploring consciousness and time',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780805210040',
        title: 'The Trial',
        edition_number: 1,
        edition_date: '1925-04-26',
        status: 'read',
        notes: 'Kafka\'s existential masterpiece about bureaucracy and alienation',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780684800107',
        title: 'The Old Man and the Sea',
        edition_number: 1,
        edition_date: '1952-09-01',
        status: 'read',
        notes: 'Hemingway\'s Nobel Prize-winning novella',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780452284234',
        title: 'Beloved',
        edition_number: 1,
        edition_date: '1987-09-16',
        status: 'available',
        notes: 'Powerful novel about slavery and its lasting impact',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780679723431',
        title: 'Norwegian Wood',
        edition_number: 1,
        edition_date: '1987-08-04',
        status: 'reading',
        notes: 'Coming-of-age story set in 1960s Tokyo',
        creation_date: now,
        update_date: now
      },
      {
        isbn_code: '9780553383904',
        title: 'The House of the Spirits',
        edition_number: 1,
        edition_date: '1982-01-01',
        status: 'available',
        notes: 'Multi-generational saga with magical realism elements',
        creation_date: now,
        update_date: now
      }
    ], {
      ignoreDuplicates: true,
      returning: true
    });

    const authors = await queryInterface.sequelize.query(
      'SELECT id, name, surname FROM authors',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getBooksIds = await queryInterface.sequelize.query(
      'SELECT id, isbn_code FROM books',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const findAuthor = (name, surname) => authors.find(a => a.name === name && a.surname === surname);
    const findCategory = (name) => categories.find(c => c.name === name);
    const findBook = (isbn) => getBooksIds.find(b => b.isbn_code === isbn);

    const bookAuthors = [];
    const bookCategories = [];

    const bookAuthorMappings = [
      { isbn: '9780451524935', authors: [['George', 'Orwell']] },
      { isbn: '9780486284736', authors: [['Jane', 'Austen']] },
      { isbn: '9780486400778', authors: [['Mark', 'Twain']] },
      { isbn: '9780060883287', authors: [['Gabriel', 'García Márquez']] },
      { isbn: '9780156907392', authors: [['Virginia', 'Woolf']] },
      { isbn: '9780805210040', authors: [['Franz', 'Kafka']] },
      { isbn: '9780684800107', authors: [['Ernest', 'Hemingway']] },
      { isbn: '9780452284234', authors: [['Toni', 'Morrison']] },
      { isbn: '9780679723431', authors: [['Haruki', 'Murakami']] },
      { isbn: '9780553383904', authors: [['Isabel', 'Allende']] }
    ];

    const bookCategoryMappings = [
      { isbn: '9780451524935', categories: ['Fiction', 'Dystopian Fiction', 'Classic Literature'] },
      { isbn: '9780486284736', categories: ['Fiction', 'Romance', 'Classic Literature'] },
      { isbn: '9780486400778', categories: ['Fiction', 'Adventure', 'Classic Literature'] },
      { isbn: '9780060883287', categories: ['Fiction', 'Magical Realism', 'Classic Literature'] },
      { isbn: '9780156907392', categories: ['Fiction', 'Modernist Literature', 'Classic Literature'] },
      { isbn: '9780805210040', categories: ['Fiction', 'Existential Fiction', 'Classic Literature'] },
      { isbn: '9780684800107', categories: ['Fiction', 'War Fiction', 'Classic Literature'] },
      { isbn: '9780452284234', categories: ['Fiction', 'Contemporary Fiction', 'Historical Fiction'] },
      { isbn: '9780679723431', categories: ['Fiction', 'Contemporary Fiction', 'Romance'] },
      { isbn: '9780553383904', categories: ['Fiction', 'Magical Realism', 'Historical Fiction'] }
    ];

    bookAuthorMappings.forEach(mapping => {
      const book = findBook(mapping.isbn);
      if (book) {
        mapping.authors.forEach(([name, surname]) => {
          const author = findAuthor(name, surname);
          if (author) {
            bookAuthors.push({
              book_id: book.id,
              author_id: author.id,
              creation_date: now,
              update_date: now
            });
          }
        });
      }
    });

    bookCategoryMappings.forEach(mapping => {
      const book = findBook(mapping.isbn);
      if (book) {
        mapping.categories.forEach(categoryName => {
          const category = findCategory(categoryName);
          if (category) {
            bookCategories.push({
              book_id: book.id,
              category_id: category.id,
              creation_date: now,
              update_date: now
            });
          }
        });
      }
    });

    if (bookAuthors.length > 0) {
      await queryInterface.bulkInsert('book_authors', bookAuthors, { ignoreDuplicates: true });
    }

    if (bookCategories.length > 0) {
      await queryInterface.bulkInsert('book_categories', bookCategories, { ignoreDuplicates: true });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('book_categories', null, {});
    await queryInterface.bulkDelete('book_authors', null, {});
    await queryInterface.bulkDelete('books', null, {});
  }
};
