const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

async function checkSchema() {
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

    // Check books table
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'my_many_books' AND TABLE_NAME = 'books' ORDER BY ORDINAL_POSITION"
    );

    console.log('Books table columns:');
    columns.forEach(col => console.log('  -', col.COLUMN_NAME));

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
