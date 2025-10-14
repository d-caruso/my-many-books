'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    return queryInterface.bulkInsert('authors', [
      {
        name: 'George',
        surname: 'Orwell',
        nationality: 'British',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Jane',
        surname: 'Austen',
        nationality: 'British',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Mark',
        surname: 'Twain',
        nationality: 'American',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Gabriel',
        surname: 'García Márquez',
        nationality: 'Colombian',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Virginia',
        surname: 'Woolf',
        nationality: 'British',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Franz',
        surname: 'Kafka',
        nationality: 'Czech',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Ernest',
        surname: 'Hemingway',
        nationality: 'American',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Toni',
        surname: 'Morrison',
        nationality: 'American',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Haruki',
        surname: 'Murakami',
        nationality: 'Japanese',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Isabel',
        surname: 'Allende',
        nationality: 'Chilean',
        creation_date: now,
        update_date: now
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('authors', null, {});
  }
};
