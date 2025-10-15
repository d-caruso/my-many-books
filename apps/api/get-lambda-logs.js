const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

async function getLogs() {
  const client = new CloudWatchLogsClient({ region: 'us-east-1' });

  const command = new FilterLogEventsCommand({
    logGroupName: '/aws/lambda/my-many-books-api-dev-api',
    startTime: Date.now() - 10 * 60 * 1000, // Last 10 minutes
    filterPattern: 'ERROR',
  });

  try {
    const response = await client.send(command);

    if (!response.events || response.events.length === 0) {
      console.log('No ERROR logs found in the last 10 minutes');
      console.log('\nFetching all recent logs...\n');

      // Get all logs
      const allLogsCommand = new FilterLogEventsCommand({
        logGroupName: '/aws/lambda/my-many-books-api-dev-api',
        startTime: Date.now() - 10 * 60 * 1000,
        limit: 50
      });

      const allResponse = await client.send(allLogsCommand);
      if (allResponse.events && allResponse.events.length > 0) {
        allResponse.events.forEach(event => {
          const timestamp = new Date(event.timestamp).toISOString();
          console.log(`[${timestamp}] ${event.message}`);
        });
      } else {
        console.log('No logs found at all');
      }
    } else {
      console.log('ERROR logs found:\n');
      response.events.forEach(event => {
        const timestamp = new Date(event.timestamp).toISOString();
        console.log(`[${timestamp}] ${event.message}`);
      });
    }
  } catch (error) {
    console.error('Error fetching logs:', error.message);
  }
}

getLogs();
