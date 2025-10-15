'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    return queryInterface.bulkInsert('categories', [
      {
        name: 'Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Classic Literature',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Dystopian Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Romance',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Adventure',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Magical Realism',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Modernist Literature',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Existential Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'War Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Contemporary Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Science Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Mystery',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Historical Fiction',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Biography',
        creation_date: now,
        update_date: now
      },
      {
        name: 'Non-Fiction',
        creation_date: now,
        update_date: now
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('categories', null, {});
  }
};
