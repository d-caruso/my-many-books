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
      // Legacy global uniqueness on categories.name may exist either as the explicit
      // idx_category_name_unique index or as the implicit column-level unique index "name".
      if (await hasIndex('categories', 'idx_category_name_unique')) {
        await queryInterface.removeIndex('categories', 'idx_category_name_unique', {
          transaction,
        });
      }

      if (await hasIndex('categories', 'name')) {
        await queryInterface.removeIndex('categories', 'name', { transaction });
      }

      // Recreate per-user unique index to guarantee the intended constraint.
      if (await hasIndex('categories', 'idx_category_user_name_unique')) {
        await queryInterface.removeIndex('categories', 'idx_category_user_name_unique', {
          transaction,
        });
      }

      await queryInterface.addIndex('categories', ['user_id', 'name'], {
        name: 'idx_category_user_name_unique',
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
      if (await hasIndex('categories', 'idx_category_user_name_unique')) {
        await queryInterface.removeIndex('categories', 'idx_category_user_name_unique', {
          transaction,
        });
      }

      // Restore legacy global uniqueness on name for rollback parity.
      if (!(await hasIndex('categories', 'name'))) {
        await queryInterface.addIndex('categories', ['name'], {
          name: 'name',
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
