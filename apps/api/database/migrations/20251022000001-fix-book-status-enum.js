'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Clear any books with 'available' or 'wishlist' status (set to NULL)
    await queryInterface.sequelize.query(`
      UPDATE books
      SET status = NULL
      WHERE status IN ('available', 'wishlist')
    `);

    // Step 2: Add a temporary column with the correct ENUM values
    await queryInterface.addColumn('books', 'status_new', {
      type: Sequelize.ENUM('reading', 'paused', 'finished'),
      allowNull: true
    });

    // Step 3: Copy data from old status to new status (reading and read map to reading/finished)
    await queryInterface.sequelize.query(`
      UPDATE books
      SET status_new = CASE
        WHEN status = 'reading' THEN 'reading'
        WHEN status = 'read' THEN 'finished'
        ELSE NULL
      END
    `);

    // Step 4: Drop the old status column (this also removes the old ENUM type)
    await queryInterface.removeColumn('books', 'status');

    // Step 5: Rename the new column to 'status'
    await queryInterface.renameColumn('books', 'status_new', 'status');
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Add back temporary column with old ENUM values
    await queryInterface.addColumn('books', 'status_old', {
      type: Sequelize.ENUM('available', 'reading', 'read', 'wishlist'),
      allowNull: true,
      defaultValue: 'available'
    });

    // Step 2: Migrate data back with reverse mapping
    await queryInterface.sequelize.query(`
      UPDATE books
      SET status_old = CASE
        WHEN status = 'reading' THEN 'reading'
        WHEN status = 'finished' THEN 'read'
        WHEN status = 'paused' THEN 'available'
        ELSE 'available'
      END
    `);

    // Step 3: Drop the new status column
    await queryInterface.removeColumn('books', 'status');

    // Step 4: Rename the old column back to 'status'
    await queryInterface.renameColumn('books', 'status_old', 'status');
  }
};
