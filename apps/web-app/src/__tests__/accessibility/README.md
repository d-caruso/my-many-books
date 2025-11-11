# Accessibility Testing

## Infrastructure Setup ✅

This directory contains the infrastructure for automated accessibility testing using vitest-axe.

### Configured Components:
- ✅ **vitest-axe** installed (v0.1.0)
- ✅ **axe-core** engine (v4.11.0) via vitest-axe
- ✅ **Test environment**: jsdom (compatible with vitest-axe)
- ✅ **Setup file**: `setupTests.ts` - extends expect with `toHaveNoViolations`
- ✅ **Test utilities**: `utils/axe-helper.ts` - helper functions for running axe tests

### Helper Functions Available:
```typescript
import { expectNoA11yViolations } from '../utils/axe-helper';

// In your test:
const { container } = render(<MyComponent />);
await expectNoA11yViolations(container);
```

### Example Test Template:
```typescript
import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../utils/axe-helper';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    await expectNoA11yViolations(container);
  });
});
```

### What Gets Tested:
vitest-axe automatically checks for 90+ WCAG 2.1 AA rules including:
- Color contrast ratios
- Form label associations
- ARIA attribute usage
- Keyboard accessibility
- Heading hierarchy
- Image alt text
- Button/link labels
- Focus management
- And more...

### Next Steps:
To add accessibility tests for specific components:
1. Create test file: `ComponentName.a11y.test.tsx`
2. Set up necessary context providers (AuthContext, Router, etc.)
3. Render component with proper mocks
4. Run `await expectNoA11yViolations(container)`

### Running Tests:
```bash
npm test -- src/__tests__/accessibility/ --run
```

### Manual Testing:
See `/docs/accessibility/manual-testing-protocol.md` for comprehensive manual testing procedures.

---

**Note**: Accessibility testing requires ~70% manual validation with assistive technologies. Automated tests catch common issues but cannot verify screen reader announcements, keyboard navigation flow, or user experience quality.
