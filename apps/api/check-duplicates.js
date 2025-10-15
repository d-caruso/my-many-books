require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'my_many_books_dev',
  process.env.DB_USER || 'admin',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

async function checkDuplicates() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const [results] = await sequelize.query(`
      SELECT name, surname, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM authors
      GROUP BY name, surname
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `);

    if (results.length === 0) {
      console.log('No duplicate authors found');
    } else {
      console.log(`Found ${results.length} duplicate author entries:`);
      results.forEach(row => {
        console.log(`  "${row.name} ${row.surname}": ${row.count} copies (IDs: ${row.ids})`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDuplicates();
