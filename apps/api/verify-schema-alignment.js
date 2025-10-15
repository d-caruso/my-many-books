const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// Expected column names from Sequelize models (snake_case in DB)
const expectedSchemas = {
  books: [
    'id', 'isbn_code', 'title', 'edition_number', 'edition_date',
    'status', 'notes', 'user_id', 'creation_date', 'update_date'
  ],
  authors: [
    'id', 'name', 'surname', 'nationality',
    'creation_date', 'update_date'
  ],
  categories: [
    'id', 'name', 'creation_date', 'update_date'
  ],
  book_authors: [
    'book_id', 'author_id', 'creation_date', 'update_date'
  ],
  book_categories: [
    'book_id', 'category_id', 'creation_date', 'update_date'
  ],
  users: [
    'id', 'email', 'name', 'surname', 'is_active',
    'creation_date', 'update_date'
  ]
};

async function verifySchemas() {
  try {
    // Get DB credentials
    const dbHost = execSync(
      "aws cloudformation describe-stacks --stack-name my-many-books-infrastructure-dev --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text",
      { encoding: 'utf-8' }
    ).trim();

    const secretArn = execSync(
      "aws cloudformation describe-stacks --stack-name my-many-books-infrastructure-dev --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' --output text",
      { encoding: 'utf-8' }
    ).trim();

    const dbPassword = JSON.parse(
      execSync(
        `aws secretsmanager get-secret-value --secret-id "${secretArn}" --query 'SecretString' --output text`,
        { encoding: 'utf-8' }
      )
    ).password;

    // Connect to database
    const connection = await mysql.createConnection({
      host: dbHost,
      user: 'admin',
      password: dbPassword,
      database: 'my_many_books',
      ssl: { rejectUnauthorized: false }
    });

    console.log('Connected to database\n');
    console.log('='.repeat(80));
    console.log('SCHEMA ALIGNMENT VERIFICATION');
    console.log('='.repeat(80));

    let hasDiscrepancies = false;

    for (const [tableName, expectedColumns] of Object.entries(expectedSchemas)) {
      const [actualColumns] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'my_many_books' AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
        [tableName]
      );

      const actualColumnNames = actualColumns.map(col => col.COLUMN_NAME);

      console.log(`\n${tableName.toUpperCase()}:`);
      console.log('-'.repeat(80));

      // Check for missing columns
      const missingColumns = expectedColumns.filter(col => !actualColumnNames.includes(col));
      if (missingColumns.length > 0) {
        hasDiscrepancies = true;
        console.log(`  ❌ MISSING columns (expected but not in DB):`);
        missingColumns.forEach(col => console.log(`     - ${col}`));
      }

      // Check for extra columns
      const extraColumns = actualColumnNames.filter(col => !expectedColumns.includes(col));
      if (extraColumns.length > 0) {
        hasDiscrepancies = true;
        console.log(`  ⚠️  EXTRA columns (in DB but not expected):`);
        extraColumns.forEach(col => console.log(`     - ${col}`));
      }

      // Check for correct columns
      const correctColumns = actualColumnNames.filter(col => expectedColumns.includes(col));
      if (correctColumns.length > 0) {
        console.log(`  ✅ CORRECT columns (${correctColumns.length}/${expectedColumns.length}):`);
        correctColumns.forEach(col => console.log(`     - ${col}`));
      }
    }

    await connection.end();

    console.log('\n' + '='.repeat(80));
    if (hasDiscrepancies) {
      console.log('❌ SCHEMA VERIFICATION FAILED - Discrepancies found');
      console.log('='.repeat(80));
      process.exit(1);
    } else {
      console.log('✅ SCHEMA VERIFICATION PASSED - All columns aligned');
      console.log('='.repeat(80));
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifySchemas();
