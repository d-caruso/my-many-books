# Development Scripts

This directory contains automation scripts for the project.

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **check-model-drift.ts** | Detect type inconsistencies across apps | `npm run check-model-drift` |

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
npm install --save-dev ts-morph
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