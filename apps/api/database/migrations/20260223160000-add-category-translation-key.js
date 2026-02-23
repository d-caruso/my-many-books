'use strict';

const DEFAULT_CATEGORY_TRANSLATION_KEYS = {
  'Fiction': 'categories.fiction',
  'Non-Fiction': 'categories.non_fiction',
  'Science Fiction': 'categories.science_fiction',
  Fantasy: 'categories.fantasy',
  'Mystery & Thriller': 'categories.mystery_thriller',
  Romance: 'categories.romance',
  'Historical Fiction': 'categories.historical_fiction',
  'Biography & Memoir': 'categories.biography_memoir',
  'Science & Technology': 'categories.science_technology',
  Horror: 'categories.horror',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'translation_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    for (const [name, translationKey] of Object.entries(DEFAULT_CATEGORY_TRANSLATION_KEYS)) {
      await queryInterface.sequelize.query(
        `UPDATE categories
         SET translation_key = :translationKey
         WHERE name = :name AND translation_key IS NULL`,
        {
          replacements: { name, translationKey },
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('categories', 'translation_key');
  },
};
