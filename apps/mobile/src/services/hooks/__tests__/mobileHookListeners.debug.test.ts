// ================================================================
// Debug test to understand why hooks aren't triggering
// ================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HookSystem, InMemoryHookStorage } from '@my-many-books/hookey';
import { MobileHookListenersManager } from '../mobileHookListeners';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('MobileHookListenersManager Debug', () => {
  let hookSystem: HookSystem;
  let listenersManager: MobileHookListenersManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    // Create hook system with in-memory storage
    const storage = new InMemoryHookStorage();
    hookSystem = new HookSystem(storage);

    // Create listeners manager
    listenersManager = new MobileHookListenersManager({
      analyticsEnabled: true,
      errorReportingEnabled: false,
      offlineStorageEnabled: false,
      performanceMonitoringEnabled: false,
      batchUploadInterval: 300,
      maxOfflineEvents: 1000,
    });
  });

  it('should debug hook registration and triggering', async () => {
    console.log('=== Starting debug test ===');
    
    // Register listeners
    console.log('Registering listeners...');
    await listenersManager.registerListeners(hookSystem);
    
    // Check registered hooks
    const hooks = await hookSystem['storage'].getHooks();
    console.log('Registered hooks:', hooks.length);
    console.log('Hook details:', hooks.map(h => ({ name: h.name, eventPattern: h.eventPattern, isActive: h.isActive })));
    
    // Trigger an event
    console.log('Triggering event: test.event');
    await hookSystem.trigger('test.event', { debug: 'data' });
    
    // Wait for async processing
    console.log('Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if any AsyncStorage calls were made
    console.log('AsyncStorage.setItem calls:', mockAsyncStorage.setItem.mock.calls.length);
    console.log('AsyncStorage.setItem calls details:', mockAsyncStorage.setItem.mock.calls);
    
    // Try to trigger the hook system differently
    console.log('Trying direct emitter trigger...');
    const emitter = hookSystem['emitter'];
    await emitter.emitAsync('test.event.direct', { direct: 'trigger' });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('After direct trigger - AsyncStorage.setItem calls:', mockAsyncStorage.setItem.mock.calls.length);
    
    expect(true).toBe(true); // This is just a debug test
  });
});