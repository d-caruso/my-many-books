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

async function cleanupAndSeedAuthors() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Delete all book_authors associations first (foreign key constraint)
    console.log('Deleting book_authors associations...');
    await sequelize.query('DELETE FROM book_authors');
    console.log('Deleted all book_authors associations');

    // Delete all authors
    console.log('Deleting all authors...');
    await sequelize.query('DELETE FROM authors');
    console.log('Deleted all authors');

    // Insert the 10 seed authors
    console.log('Inserting seed authors...');
    const now = new Date();

    await sequelize.query(`
      INSERT INTO authors (name, surname, nationality, creation_date, update_date)
      VALUES
        ('George', 'Orwell', 'British', :now, :now),
        ('Jane', 'Austen', 'British', :now, :now),
        ('Mark', 'Twain', 'American', :now, :now),
        ('Gabriel', 'García Márquez', 'Colombian', :now, :now),
        ('Virginia', 'Woolf', 'British', :now, :now),
        ('Franz', 'Kafka', 'Czech', :now, :now),
        ('Ernest', 'Hemingway', 'American', :now, :now),
        ('Toni', 'Morrison', 'American', :now, :now),
        ('Haruki', 'Murakami', 'Japanese', :now, :now),
        ('Isabel', 'Allende', 'Chilean', :now, :now)
    `, {
      replacements: { now }
    });

    console.log('Successfully inserted 10 seed authors');

    // Verify results
    const [authors] = await sequelize.query('SELECT id, name, surname FROM authors ORDER BY id');
    console.log('\nCurrent authors in database:');
    authors.forEach(author => {
      console.log(`  ID ${author.id}: ${author.name} ${author.surname}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanupAndSeedAuthors();
