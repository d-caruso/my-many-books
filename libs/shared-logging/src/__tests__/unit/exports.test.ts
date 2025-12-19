import * as root from '../../index';
import * as adapters from '../../adapters';
import * as config from '../../config';
import * as interfaces from '../../interfaces';
import * as middleware from '../../middleware';
import * as services from '../../services';

describe('shared-logging exports', () => {
  it('exports main modules', () => {
    expect(root).toBeDefined();
    expect(adapters).toBeDefined();
    expect(config).toBeDefined();
    expect(interfaces).toBeDefined();
    expect(middleware).toBeDefined();
    expect(services).toBeDefined();
  });

  it('exports key symbols', () => {
    expect(typeof services.LogManager).toBe('function');
    expect(typeof middleware.requestLoggerMiddleware).toBe('function');
    expect(typeof middleware.traceIdMiddleware).toBe('function');
    expect(typeof config.createPinoConfig).toBe('function');
    expect(typeof adapters.S3Adapter).toBe('function');
    expect(typeof adapters.CloudWatchAdapter).toBe('function');
    expect(typeof adapters.DatabaseAdapter).toBe('function');
  });
});

