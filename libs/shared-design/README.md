# @my-many-books/shared-design

Shared, platform-agnostic design primitives for the monorepo.

## What it provides

- **Design tokens**: `designTokens` (colors, spacing, typography, etc.)
- **Themes**: `themes` (built from tokens)
- **Component styles**: `componentStyles` (platform-agnostic style objects)
- **UI-agnostic severity**: `SEVERITY`, `Severity`, `severityToHex`

## Severity (UI-agnostic)

`Severity` is a simple, cross-platform semantic signal:

- `success`
- `warning`
- `error`
- `neutral`

Use it for health/status indicators, alerts, and any “good / degraded / bad / unknown” UI state.

### Rule: map at the app boundary

Apps should convert `Severity` to whatever the current UI framework needs:

- **Web (MUI)**: map to MUI color tokens (ex: `'success' | 'warning' | 'error' | 'default'`) or style via `sx` using hex colors.
- **Mobile (React Native / Paper)**: map to theme colors / component props in the mobile UI framework.

Shared libraries should avoid depending on framework-specific tokens.

### `severityToHex`

If your component can take a hex color, use:

```ts
import { SEVERITY, severityToHex } from '@my-many-books/shared-design';

const warningColor = severityToHex(SEVERITY.WARNING);
```

### Web (MUI) example mapper

```ts
import type { Severity } from '@my-many-books/shared-design';

type MuiChipColor = 'success' | 'warning' | 'error' | 'default';

export const severityToMuiChipColor = (severity: Severity): MuiChipColor =>
  severity === 'neutral' ? 'default' : severity;
```

### Mobile example mapper

```ts
import { severityToHex, type Severity } from '@my-many-books/shared-design';

export const severityToColor = (severity: Severity) => severityToHex(severity);
```

