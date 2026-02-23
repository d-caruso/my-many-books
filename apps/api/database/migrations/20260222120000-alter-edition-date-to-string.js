'use strict';

/**
 * Migration: Convert edition_date from DATEONLY to STRING(10)
 *
 * Supports flexible date granularity:
 * - "YYYY"       (year only)
 * - "YYYY-MM"    (month + year)
 * - "YYYY-MM-DD" (full date)
 *
 * Existing DATEONLY values are converted to "YYYY-MM-DD" strings before
 * the column type change.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(`
        UPDATE books
        SET edition_date = DATE_FORMAT(edition_date, '%Y-%m-%d')
        WHERE edition_date IS NOT NULL
      `);
    }
    // SQLite and Postgres store DATEONLY as 'YYYY-MM-DD' strings already — no conversion needed.

    await queryInterface.changeColumn('books', 'edition_date', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // WARNING: Rolling back loses year-only and month-only precision.
    // Values like "2024" or "2024-03" cannot be represented as DATE.
    await queryInterface.changeColumn('books', 'edition_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });
  },
};
