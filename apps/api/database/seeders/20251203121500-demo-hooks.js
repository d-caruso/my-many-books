'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'prod') {
      console.warn('[seed:demo-hooks] Skipping: demo data must not be seeded in production.');
      return;
    }

    const now = new Date();

    const tableCheck = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      {
        replacements: ['hooks'],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    const hooksTableExists =
      tableCheck.length > 0 &&
      Number(
        tableCheck[0].count ??
          tableCheck[0]['COUNT(*)'] ??
          tableCheck[0].COUNT ??
          tableCheck[0]['COUNT']
      ) > 0;

    if (!hooksTableExists) {
      console.warn('[seed:demo-hooks] Skipping because hooks table does not exist yet.');
      return;
    }

    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      {
        replacements: ['demo@example.com'],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    const demoUserId = users.length > 0 ? users[0].id : null;

    const hooks = [
      {
        name: 'Audit Logger',
        description: 'Log every hook event for compliance and troubleshooting.',
        event_pattern: '**',
        action_type: 'log',
        action_config: JSON.stringify({
          prefix: 'audit',
          level: 'info',
          destination: 'file',
          file_path: '/var/log/app/audit.log',
          include_metadata: true,
        }),
        is_active: true,
        priority: 100,
        created_by: demoUserId,
        creation_date: now,
        update_date: now,
      },
      {
        name: 'Failed Login Logger',
        description: 'Capture failed authentication attempts for security monitoring.',
        event_pattern: 'auth.login.failed',
        action_type: 'log',
        action_config: JSON.stringify({
          prefix: 'security',
          level: 'warn',
          destination: 'file',
          file_path: '/var/log/app/security.log',
          include_metadata: true,
        }),
        is_active: true,
        priority: 90,
        created_by: demoUserId,
        creation_date: now,
        update_date: now,
      },
      {
        name: 'Book Created Notification',
        description: 'Create notification records whenever a book is created.',
        event_pattern: 'book.create.after',
        action_type: 'database',
        action_config: JSON.stringify({
          operation: 'create',
          table: 'notifications',
          data: {
            user_id: '{{user.id}}',
            type: 'book_created',
            message: 'You created {{book.title}}',
            read: false,
          },
        }),
        is_active: false,
        priority: 60,
        created_by: demoUserId,
        creation_date: now,
        update_date: now,
      },
      {
        name: 'Welcome Email',
        description: 'Send a friendly welcome email after user registration.',
        event_pattern: 'user.register.after',
        action_type: 'email',
        action_config: JSON.stringify({
          to: '{{user.email}}',
          subject: 'Welcome to My Many Books, {{user.name}}!',
          template:
            'Hi {{user.name}},\n\nThanks for registering on My Many Books. Start by adding your first title today!\n\nHappy reading,\nThe My Many Books Team',
          from: 'welcome@my-many-books.app',
        }),
        is_active: false,
        priority: 50,
        created_by: demoUserId,
        creation_date: now,
        update_date: now,
      },
    ];

    await queryInterface.bulkInsert('hooks', hooks);
  },

  async down(queryInterface, Sequelize) {
    const tableCheck = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      {
        replacements: ['hooks'],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    const hooksTableExists =
      tableCheck.length > 0 &&
      Number(
        tableCheck[0].count ??
          tableCheck[0]['COUNT(*)'] ??
          tableCheck[0].COUNT ??
          tableCheck[0]['COUNT']
      ) > 0;

    if (!hooksTableExists) {
      console.warn('[seed:demo-hooks] Skip rollback because hooks table does not exist.');
      return;
    }

    const hookNames = [
      'Audit Logger',
      'Failed Login Logger',
      'Book Created Notification',
      'Welcome Email',
    ];

    await queryInterface.bulkDelete(
      'hooks',
      {
        name: {
          [Sequelize.Op.in]: hookNames,
        },
      },
      {}
    );
  },
};
