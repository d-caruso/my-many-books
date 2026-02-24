'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const hasIndex = async (tableName, indexName) => {
      const [rows] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${tableName}\`;`, {
        transaction,
      });

      return rows.some((row) => row.Key_name === indexName);
    };

    try {
      // Legacy global unique index blocks onboarding seeding because default authors
      // (e.g. William Shakespeare) must be allowed for different users.
      if (await hasIndex('authors', 'idx_author_name_surname')) {
        await queryInterface.removeIndex('authors', 'idx_author_name_surname', { transaction });
      }

      // Recreate as UNIQUE per user. A non-unique version may already exist from the
      // user_id migration, so we drop and rebuild it to guarantee the constraint.
      if (await hasIndex('authors', 'idx_author_user_name_surname')) {
        await queryInterface.removeIndex('authors', 'idx_author_user_name_surname', {
          transaction,
        });
      }

      await queryInterface.addIndex('authors', ['user_id', 'name', 'surname'], {
        name: 'idx_author_user_name_surname',
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const hasIndex = async (tableName, indexName) => {
      const [rows] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${tableName}\`;`, {
        transaction,
      });

      return rows.some((row) => row.Key_name === indexName);
    };

    try {
      if (await hasIndex('authors', 'idx_author_user_name_surname')) {
        await queryInterface.removeIndex('authors', 'idx_author_user_name_surname', {
          transaction,
        });
      }

      // Restore previous legacy behavior (global uniqueness) for rollback parity.
      if (!(await hasIndex('authors', 'idx_author_name_surname'))) {
        await queryInterface.addIndex('authors', ['name', 'surname'], {
          name: 'idx_author_name_surname',
          unique: true,
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
