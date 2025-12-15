# @my-many-books/shared-logging

Unified logging infrastructure with pluggable storage adapters for the My Many Books application.

## Features

- **Structured Logging**: Using Pino for high-performance JSON logging
- **Pluggable Adapters**: CloudWatch, Database, S3, Loki support
- **Audit Logging**: Immutable audit trail for compliance
- **Trace Correlation**: TraceId propagation across all logs
- **Async Operations**: Non-blocking log writes
- **PII Redaction**: Automatic sensitive data removal

## Installation

```bash
npm install @my-many-books/shared-logging
```

## Usage

```typescript
import { createLogger, LogManager, CloudWatchAdapter } from '@my-many-books/shared-logging';

// Create logger with adapters
const logger = createLogger({
  adapters: [
    new CloudWatchAdapter({
      logGroupName: '/my-many-books/api',
      region: 'us-east-1'
    })
  ]
});

// Log messages
logger.info({ userId: '123', action: 'login' }, 'User logged in');
```

## Architecture

See `docs/logging/unified-logging-plan.md` for detailed architecture and implementation plan.

## License

MIT
