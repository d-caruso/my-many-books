# Handler Patterns Documentation

## Overview

The Handler Patterns system provides three distinct strategies for handling API operations in the mobile app, each optimized for different use cases and network conditions.

## Handler Strategies

### 1. ClientGateway - Pure HTTP Strategy

**Use Case**: When you need immediate HTTP calls and want to fail fast when offline.

**Characteristics**:
- ✅ Immediate HTTP requests 
- ✅ Fails fast when offline
- ✅ Response caching support
- ❌ No offline queueing
- ❌ No automatic retry

**When to Use**:
- Critical operations that must complete immediately
- Operations that require real-time server state
- When offline functionality is not needed

```typescript
import { createClientGateway, createDefaultClientGatewayConfig } from './gateways/clientGateway';

const config = createDefaultClientGatewayConfig(httpClient);
const bookGateway = createClientGateway<Book>('book', config);

// Will succeed if online, throw error if offline
const book = await bookGateway.create({
  title: 'New Book',
  author: 'Author Name',
  status: 'reading'
});
```

### 2. MobileHandler - Auto-Queueing Strategy

**Use Case**: When you want to try HTTP first but automatically queue when offline.

**Characteristics**:
- ✅ Tries HTTP when online
- ✅ Automatically queues when offline
- ✅ Optimistic responses for UI
- ✅ Network state detection
- ❌ More complex error handling

**When to Use**:
- User-facing operations that should always succeed
- Operations that benefit from optimistic updates
- Most mobile app scenarios

```typescript
import { createMobileHandler, createDefaultMobileHandlerConfig } from './gateways/mobileHandler';

const config = createDefaultMobileHandlerConfig('book', httpClient);
config.networkProvider = networkProvider;
config.queue = operationQueue;

const bookHandler = createMobileHandler<Book>('book', config);

// Will try HTTP if online, queue if offline, return optimistic response
const book = await bookHandler.create({
  title: 'New Book',
  author: 'Author Name',
  status: 'reading'
});
```

### 3. QueueHandler - Queue-Only Strategy

**Use Case**: When you want to queue operations without making HTTP calls.

**Characteristics**:
- ✅ Always queues operations
- ✅ Never makes HTTP calls
- ✅ Prevents double-queueing
- ✅ Multiple ID generation strategies
- ❌ No immediate server response
- ❌ Requires separate sync mechanism

**When to Use**:
- Processing queued operations during sync
- Bulk operations that should be batched
- When you want explicit control over when server calls happen

```typescript
import { createQueueHandler, createDefaultQueueHandlerConfig } from './gateways/queueHandler';

const config = createDefaultQueueHandlerConfig('book');
const bookHandler = createQueueHandler<Book>('book', config);

// Always queues, returns temp ID
const tempId = await bookHandler.create({
  title: 'New Book',
  author: 'Author Name',
  status: 'reading'
});
```

## Strategy Selection Guide

```typescript
// Strategy selection based on conditions
function selectHandlerStrategy(conditions: {
  isOnline: boolean;
  requiresImmediate: boolean;
  canQueue: boolean;
}) {
  if (conditions.requiresImmediate && conditions.isOnline) {
    return 'clientGateway'; // Immediate HTTP required
  }
  
  if (conditions.canQueue && !conditions.isOnline) {
    return 'queueHandler'; // Offline, queue only
  }
  
  if (conditions.isOnline) {
    return 'mobileHandler'; // Try HTTP with fallback
  }
  
  return 'queueHandler'; // Default to queuing
}
```

## Factory Pattern

All handlers support factory patterns for easier management:

```typescript
import { QueueHandlerFactory } from './gateways/queueHandler';
import { ClientGatewayFactory } from './gateways/clientGateway';

// Create factories for consistent configuration
const queueFactory = new QueueHandlerFactory(
  createDefaultQueueHandlerConfig('book')
);

const clientFactory = new ClientGatewayFactory(
  createDefaultClientGatewayConfig(httpClient)
);

// Create handlers for different resources
const bookHandler = queueFactory.createBookHandler<Book>();
const authorHandler = queueFactory.createAuthorHandler();

// Update configuration for all handlers
queueFactory.updateConfig({
  queueOptions: {
    generateOptimisticIds: true,
    idGenerationStrategy: 'uuid'
  }
});
```

## Configuration Options

### ClientGateway Options

```typescript
interface ClientGatewayOptions {
  failFast: boolean;           // Fail immediately when offline
  validateResponses: boolean;  // Enable response validation
  enableCaching: boolean;      // Enable response caching
  cacheTTL: number;           // Cache TTL in milliseconds
}
```

### QueueHandler Options

```typescript
interface QueueHandlerOptions {
  generateOptimisticIds: boolean;     // Generate temp IDs for operations
  idGenerationStrategy: 'uuid' | 'timestamp' | 'sequential';
  validateBeforeQueue: boolean;       // Validate before queuing
  deduplicateOperations: boolean;     // Prevent duplicate operations
  conflictResolution: 'last-write-wins' | 'manual';
}
```

### MobileHandler Options

```typescript
interface MobileHandlerOptions {
  optimisticUpdates: boolean;    // Return optimistic responses
  offlineCacheFallback: boolean; // Use cache when offline
  autoRetryOnConnection: boolean; // Retry when connection restored
}
```

## Performance Considerations

### Memory Management

The handlers include built-in memory optimization:

```typescript
import { HandlerResourceManager } from './utils/MemoryManager';

// Get shared resource manager
const manager = HandlerResourceManager.getInstance();

// Get optimized cache for resource type
const cache = manager.getCache<string, Book>('book', 300000); // 5 min TTL

// Get object pool for reusable objects
const pool = manager.getPool('book', 
  () => createBookObject(),
  (obj) => resetBookObject(obj)
);

// Clean up resources when done
manager.clearResourceType('book');
```

### Performance Benchmarks

All handlers are benchmarked for performance:

- **QueueHandler**: >50 operations/second, <15MB memory for 500 operations
- **ClientGateway**: >100 operations/second, <5MB memory for 100 operations  
- **Concurrent Operations**: 100+ concurrent operations complete <5 seconds

### Optimization Features

1. **Deduplication**: QueueHandler prevents duplicate operations
2. **Response Caching**: ClientGateway caches GET responses  
3. **Object Pooling**: Reusable objects reduce GC pressure
4. **Config Caching**: Cached request configurations
5. **Memory Monitoring**: Built-in memory usage tracking

## Error Handling

### ApiError Integration

All handlers use structured error handling:

```typescript
import { ApiError, ErrorCode } from '../../types/errors';

try {
  const result = await handler.create(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`Error code: ${error.code}`);
    console.log(`Retriable: ${error.retriable}`);
    console.log(`Status: ${error.statusCode}`);
  }
}
```

### Error Types

- `NETWORK_OFFLINE`: Device is offline
- `NETWORK_TIMEOUT`: Request timed out  
- `NETWORK_FAILED`: Network request failed
- `HTTP_CLIENT_ERROR`: 4xx HTTP errors
- `HTTP_SERVER_ERROR`: 5xx HTTP errors  
- `QUEUE_ERROR`: Queue operation failed
- `VALIDATION_ERROR`: Data validation failed

## Integration with Existing Systems

### Operation Queue Integration

```typescript
import { operationQueue } from '../OperationQueue';

const config = createDefaultQueueHandlerConfig('book');
// QueueHandler automatically uses the global operationQueue via adapter
```

### Network State Integration

```typescript
import { networkProvider } from '../NetworkProvider';

const mobileConfig = createDefaultMobileHandlerConfig('book', httpClient);
mobileConfig.networkProvider = networkProvider;
```

### ID Mapping Integration

```typescript
import { idMappingService } from '../sync/IDMappingService';

// Handlers automatically resolve foreign keys via ID mapping
// when integrated with existing sync system
```

## Testing

### Unit Testing

Each handler has comprehensive unit tests:

```typescript
// Test files location:
// src/__tests__/services/handlers/gateways/
// src/__tests__/services/handlers/types/
// src/__tests__/services/handlers/validation/
```

### Integration Testing

Cross-handler integration tests:

```typescript
// Test files location:
// src/__tests__/services/handlers/integration/
```

### Performance Testing

Performance benchmarks and memory tests:

```typescript
// Test files location:
// src/__tests__/services/handlers/performance/
```

## Best Practices

### 1. Strategy Selection

```typescript
// ✅ Good: Choose strategy based on requirements
const handler = isOnline && needsImmediate 
  ? clientGateway 
  : mobileHandler;

// ❌ Bad: Always using same strategy
const handler = clientGateway; // Won't work offline
```

### 2. Error Handling

```typescript
// ✅ Good: Handle specific error types
catch (error) {
  if (error instanceof ApiError && error.retriable) {
    // Retry logic
  } else {
    // Show user error
  }
}

// ❌ Bad: Generic error handling
catch (error) {
  console.error(error); // No specific handling
}
```

### 3. Resource Management

```typescript
// ✅ Good: Clean up resources
const factory = new QueueHandlerFactory(config);
// ... use factory
factory.clearQueue(); // Clean up when done

// ❌ Bad: No cleanup
const factory = new QueueHandlerFactory(config);
// Memory leak potential
```

### 4. Configuration

```typescript
// ✅ Good: Use appropriate configuration for environment
const config = isProduction 
  ? createOptimizedConfig()
  : createDevelopmentConfig();

// ❌ Bad: Same config everywhere
const config = createDefaultConfig(); // May not be optimal
```

## Troubleshooting

### Common Issues

1. **Handler not queueing offline**
   - Check network provider configuration
   - Verify queue is properly set up
   - Check error handling

2. **Duplicate operations**
   - Enable deduplication in QueueHandler
   - Check ID generation strategy
   - Verify operation hashing

3. **Memory leaks**
   - Use ResourceManager for cleanup
   - Clear caches periodically
   - Check for retained references

4. **Poor performance**
   - Enable response caching
   - Use object pooling
   - Check for unnecessary object creation

### Debugging

```typescript
// Enable debug logging
const config = createDefaultQueueHandlerConfig('book');
config.debug = true;

// Monitor memory usage
import { MemoryMonitor } from './utils/MemoryManager';
MemoryMonitor.measure('before_operation');
await handler.create(data);
MemoryMonitor.measure('after_operation');
const diff = MemoryMonitor.getDifference('before_operation', 'after_operation');
```

## Migration Guide

### From Direct API Calls

```typescript
// Before: Direct API calls
const response = await httpClient.post('/api/books', data);

// After: Handler pattern
const bookHandler = createMobileHandler<Book>('book', config);
const book = await bookHandler.create(data);
```

### From Custom Offline Logic

```typescript
// Before: Custom offline handling
if (navigator.onLine) {
  await httpClient.post('/api/books', data);
} else {
  queue.add('CREATE', 'book', data);
}

// After: Handler pattern
const bookHandler = createMobileHandler<Book>('book', config);
await bookHandler.create(data); // Handles online/offline automatically
```

## Future Enhancements

The handler pattern is designed to be extensible:

- **Batch Operations**: Support for batching multiple operations
- **Advanced Caching**: LRU cache with compression
- **Metrics**: Built-in performance metrics
- **Circuit Breaker**: Automatic failure detection and recovery
- **Retry Strategies**: Configurable retry with backoff
- **Middleware**: Plugin system for cross-cutting concerns

---

For more examples and advanced usage, see the test files and integration examples.