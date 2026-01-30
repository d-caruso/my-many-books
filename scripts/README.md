# Development Scripts

This directory contains automation scripts for the project.

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **check-model-drift.ts** | Detect type inconsistencies across apps | `npm run check-model-drift` |
| **benchmark-hookey-handlers.sh** | Run the Hookey admin handler benchmarks (Postman/Newman) | `npm run benchmark:hookey-handlers` |
| **benchmark-hookey-queue-sync.sh** | Run the Hookey queue/sync benchmarks (Postman/Newman) | `npm run benchmark:hookey-queue-sync` |
| **benchmark-hookey-lifecycle.sh** | Run the Hookey lifecycle event performance benchmarks (Postman/Newman) | `npm run benchmark:hookey-lifecycle` |

## Script Documentation

- [Model Drift Checker](../docs/tools/MODEL_DRIFT_CHECKER.md) - Detailed guide for type consistency checking

## Adding New Scripts

1. Create script in `scripts/`
2. Add documentation in `docs/tools/`
3. Update this README
4. Add npm script to `package.json`

## Requirements

Scripts require the following development dependencies:

```bash
npm install --save-dev newman ts-morph
```

## Usage Patterns

### Running Scripts

```bash
# Via npm scripts (recommended)
npm run check-model-drift

# Direct execution
npx ts-node scripts/check-model-drift.ts

# With debugging
DEBUG=1 npx ts-node scripts/check-model-drift.ts
```

### Hookey Benchmark Scripts

Two shell helpers exist for running the Postman benchmark collections via Newman:

```bash
npm run benchmark:hookey-handlers
npm run benchmark:hookey-queue-sync
```

They rely on the Postman environment files (`apps/api/postman/environments/...`) that already define `baseUrl` and `apiVersion`, so no extra CLI overrides should be needed unless you want to target a different endpoint.

Both scripts call `scripts/newman-runner.sh`, which accepts the collection file, report prefix, and an optional `--environment` path (or set `POSTMAN_ENVIRONMENT`).

Generated reports go under `reports/` with a timestamped prefix.

### Script Development

When creating new scripts:

1. **Use TypeScript** for type safety
2. **Add CLI support** with `require.main === module` check
3. **Export classes/functions** for testing
4. **Include error handling** and user-friendly output
5. **Document all options** and examples

### Example Script Template

```typescript
#!/usr/bin/env npx ts-node

class MyScript {
  async run(): Promise<void> {
    console.log('🚀 Starting script...');
    // Implementation here
  }
}

// CLI execution
if (require.main === module) {
  const script = new MyScript();
  script.run().catch(console.error);
}

export { MyScript };
```
