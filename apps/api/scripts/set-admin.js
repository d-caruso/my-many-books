/**
 * Script to promote a user to admin role
 * Usage: node scripts/set-admin.js <email>
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'my_many_books',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  logging: false
});

async function setAdmin(email) {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const [results] = await sequelize.query(
      'UPDATE users SET role = ? WHERE email = ?',
      {
        replacements: ['admin', email]
      }
    );

    if (results.affectedRows === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`✅ Successfully promoted ${email} to admin role`);

    // Verify the change
    const [[user]] = await sequelize.query(
      'SELECT email, role FROM users WHERE email = ?',
      {
        replacements: [email]
      }
    );

    console.log('\n📋 User details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/set-admin.js <email>');
  console.error('   Example: node scripts/set-admin.js user@example.com');
  process.exit(1);
}

setAdmin(email);
