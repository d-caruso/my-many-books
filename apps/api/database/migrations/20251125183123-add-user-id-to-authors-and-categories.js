module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ============================================================
      // STEP 1: Find an admin user (if any exist)
      // ============================================================
      const [users] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1;`,
        { transaction }
      );

      const hasUsers = users && users.length > 0;
      const adminUserId = hasUsers ? users[0].id : null;

      if (hasUsers) {
        console.log(`Found admin user with ID: ${adminUserId}`);
      } else {
        console.log('No users found. Skipping user assignment for existing authors/categories.');
      }

      // ============================================================
      // STEP 2: Add user_id column to AUTHORS table
      // ============================================================
      await queryInterface.addColumn(
        'authors',
        'user_id',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true, // Temporarily allow null for migration
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction }
      );

      // ============================================================
      // STEP 3: Assign all existing authors to admin user (if users exist)
      // ============================================================
      if (hasUsers) {
        await queryInterface.sequelize.query(
          `UPDATE authors SET user_id = ${adminUserId} WHERE user_id IS NULL;`,
          { transaction }
        );
        console.log('Assigned all existing authors to admin user');
      }

      // ============================================================
      // STEP 4: Add index on authors.user_id
      // ============================================================
      await queryInterface.addIndex(
        'authors',
        ['user_id'],
        {
          name: 'idx_author_user_id',
          transaction,
        }
      );

      // ============================================================
      // STEP 5: Add user_id column to CATEGORIES table
      // ============================================================
      await queryInterface.addColumn(
        'categories',
        'user_id',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true, // Temporarily allow null for migration
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction }
      );

      // ============================================================
      // STEP 6: Assign all existing categories to admin user (if users exist)
      // ============================================================
      if (hasUsers) {
        await queryInterface.sequelize.query(
          `UPDATE categories SET user_id = ${adminUserId} WHERE user_id IS NULL;`,
          { transaction }
        );
        console.log('Assigned all existing categories to admin user');
      }

      // ============================================================
      // STEP 7: Remove global unique constraint on categories.name
      // ============================================================
      // Categories should be unique per user, not globally
      await queryInterface.removeIndex('categories', 'idx_category_name_unique', { transaction });

      // ============================================================
      // STEP 8: Add composite unique index (user_id, name) for categories
      // ============================================================
      await queryInterface.addIndex(
        'categories',
        ['user_id', 'name'],
        {
          unique: true,
          name: 'idx_category_user_name_unique',
          transaction,
        }
      );

      // ============================================================
      // STEP 9: Add index on categories.user_id
      // ============================================================
      await queryInterface.addIndex(
        'categories',
        ['user_id'],
        {
          name: 'idx_category_user_id',
          transaction,
        }
      );

      // ============================================================
      // STEP 10: Add composite index (user_id, name, surname) for authors
      // ============================================================
      // Authors should be unique per user (same author can exist for different users)
      await queryInterface.addIndex(
        'authors',
        ['user_id', 'name', 'surname'],
        {
          name: 'idx_author_user_name_surname',
          transaction,
        }
      );

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed, rolling back:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      await queryInterface.removeIndex('authors', 'idx_author_user_id', { transaction });
      await queryInterface.removeIndex('authors', 'idx_author_user_name_surname', { transaction });
      await queryInterface.removeIndex('categories', 'idx_category_user_id', { transaction });
      await queryInterface.removeIndex('categories', 'idx_category_user_name_unique', { transaction });

      // Remove columns
      await queryInterface.removeColumn('authors', 'user_id', { transaction });
      await queryInterface.removeColumn('categories', 'user_id', { transaction });

      // Restore global unique constraint on categories.name
      await queryInterface.addIndex(
        'categories',
        ['name'],
        {
          unique: true,
          name: 'idx_category_name_unique',
          transaction,
        }
      );

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  },
};