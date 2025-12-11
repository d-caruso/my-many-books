# Audit Logging Configuration

## Overview

The audit logging system tracks user actions for compliance, security investigations, and access control audits. It uses a **hierarchical precedence** model to balance security requirements with operational flexibility.

## Configuration Hierarchy

The system checks settings in this priority order:

```typescript
function isAuditLoggingEnabled(): boolean {
  // 1. FORCE_DISABLED = Security override (highest priority)
  if (process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true') {
    return false; // Admin panel CAN'T override this
  }

  // 2. FORCE_ENABLED = Security override (second priority)
  if (process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true') {
    return true; // Admin panel CAN'T override this
  }

  // 3. Database setting (admin panel toggle)
  // Only used if no FORCE_* env vars are set
  const dbSetting = getDatabaseSetting();
  if (dbSetting !== null) {
    return dbSetting;
  }

  // 4. Default fallback
  return true;
}
```

---

## Environment Variables

### `AUDIT_LOGGING_FORCE_DISABLED`

**Purpose:** Security override to permanently disable audit logging

**Usage:**
```env
AUDIT_LOGGING_FORCE_DISABLED=true
```

**Behavior:**
- ❌ Audit logging: **ALWAYS OFF**
- ❌ Admin panel toggle: **DISABLED/GRAYED OUT**
- 🧪 Use case: Local development, testing environments

**When to use:**
- Development environments where audit logs add noise
- Test environments where you want to reduce database writes
- Debugging scenarios

---

### `AUDIT_LOGGING_FORCE_ENABLED`

**Purpose:** Security override to permanently enable audit logging

**Usage:**
```env
AUDIT_LOGGING_FORCE_ENABLED=true
```

**Behavior:**
- ✅ Audit logging: **ALWAYS ON**
- ❌ Admin panel toggle: **DISABLED/GRAYED OUT** (shows "Enforced by deployment")
- 🔒 Use case: Production, compliance-required environments

**When to use:**
- Production environments
- Compliance-required deployments (GDPR, SOC2, HIPAA, etc.)
- Security-critical environments
- Prevents malicious admins from disabling audit trail

---

## Database Setting (Admin Panel)

**Purpose:** Runtime control when no environment override is set

**Behavior:**
- Only effective when **no `FORCE_*` env vars are set**
- Stored in database `settings` table
- Cached in memory for performance
- Can be toggled via Admin Panel UI

**Default:** `true` (enabled)

---

## Configuration Scenarios

### Scenario 1: Production (Compliance - Always ON)

**`.env` configuration:**
```env
AUDIT_LOGGING_FORCE_ENABLED=true
```

**Result:**
- ✅ Audit logging: **ALWAYS ON**
- ❌ Admin panel toggle: **DISABLED** (shows badge: "Enforced by deployment config")
- 🔒 Security: Cannot be turned off even by admin
- 📋 Compliance: Meets audit trail requirements

---

### Scenario 2: Development (Testing - Always OFF)

**`.env` configuration:**
```env
AUDIT_LOGGING_FORCE_DISABLED=true
```

**Result:**
- ❌ Audit logging: **ALWAYS OFF**
- ❌ Admin panel toggle: **DISABLED**
- 🧪 Benefit: Reduced noise in logs, faster local development
- ⚡ Performance: No database writes for audit logs

---

### Scenario 3: Staging (Flexible - Admin Controls)

**`.env` configuration:**
```env
# No FORCE_* vars set
```

**Result:**
- 🎛️ Admin panel toggle: **ACTIVE** (controls the setting)
- 💾 Database setting is used
- 🔄 Can be toggled on/off via UI in real-time
- Default if DB empty: **enabled**
- 🧪 Use case: Testing audit log features, demos, internal environments

---

### Scenario 4: Fresh Install (No configuration)

**`.env` configuration:**
```env
# No env vars set
```

**Database:** No setting stored yet

**Result:**
- ✅ Default: **enabled**
- 🎛️ Admin can configure via panel

---

## Configuration Matrix

| Env Setting | DB Setting | Result | Admin Can Change? | UI State |
|-------------|-----------|--------|-------------------|----------|
| `FORCE_DISABLED=true` | Any | ❌ OFF | ❌ No | Toggle disabled, unchecked |
| `FORCE_ENABLED=true` | Any | ✅ ON | ❌ No | Toggle disabled, checked |
| Not set | `true` | ✅ ON | ✅ Yes | Toggle active, checked |
| Not set | `false` | ❌ OFF | ✅ Yes | Toggle active, unchecked |
| Not set | Not set | ✅ ON (default) | ✅ Yes | Toggle active, checked |

---

## Admin Panel UI Behavior

```typescript
// Pseudo-code for admin settings page:
if (process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true') {
  // Show: Toggle (disabled, unchecked) + badge "Disabled by deployment config"
  // Help text: "Audit logging is disabled by infrastructure configuration"
} else if (process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true') {
  // Show: Toggle (disabled, checked) + badge "Enforced by deployment config"
  // Help text: "Audit logging is enforced by infrastructure configuration"
} else {
  // Show: Toggle (active) + "Controlled via admin panel"
  // Help text: "Toggle audit logging on/off (updates in real-time)"
}
```

---

## What Gets Logged

Each audit log entry captures:

| Field | Description | Example |
|-------|-------------|---------|
| `userId` | User who performed the action | `42` |
| `role` | User's role at time of action | `admin` |
| `action` | Action performed | `create`, `update`, `delete` |
| `resourceType` | Type of resource | `hook`, `book`, `user` |
| `resourceId` | ID of affected resource | `123` |
| `ipAddress` | Client IP address | `192.168.1.100` |
| `userAgent` | Client user agent | `Mozilla/5.0...` |
| `details` | Additional context (JSON) | `{ "name": "My Hook", ... }` |
| `createdAt` | Timestamp | `2025-12-11T10:30:00Z` |
| `traceId` | Request correlation ID | `abc123...` |

---

## Persistence Strategy

### Current: Direct Async Database Writes

**Implementation:**
- Logs written to Pino immediately (CloudWatch/console)
- Database writes are fire-and-forget async calls
- Simple, no external dependencies

**Tradeoffs:**
- ✅ Simple architecture
- ✅ No Redis dependency
- ❌ Database errors = lost audit logs (logged to Pino)
- ❌ No retry logic

### Future: Bull Queue (Optional)

**Can be enabled via:**
```env
USE_AUDIT_QUEUE=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Benefits:**
- ✅ Retry logic (3 attempts, exponential backoff)
- ✅ Job persistence (survives app crashes)
- ✅ Monitoring (inspect failed jobs)
- ✅ Decoupling (DB issues don't block API)

**Tradeoffs:**
- ❌ Requires Redis
- ❌ More complexity

**Note:** The code is structured to support both strategies without refactoring.

---

## Security Considerations

1. **Immutability:** Audit logs cannot be modified or deleted (DB constraints)
2. **Separation of Concerns:** Audit logs stored separately from application data
3. **PII Redaction:** Sensitive fields (passwords, tokens, SSN) automatically redacted
4. **Tamper Detection:** TraceId correlation allows verification of log integrity
5. **Access Control:** Only admins can view audit logs
6. **Retention:** Configure retention policy based on compliance requirements

---

## Performance

- **Pino Logging:** ~10-20μs per log (non-blocking)
- **Database Write:** Fire-and-forget async (doesn't block response)
- **Memory Impact:** Minimal (cached setting checked once per request)
- **Cache Invalidation:** Instant when setting changes

---

## Compliance Mappings

| Requirement | Implementation |
|-------------|----------------|
| **SOC2** - Audit trail | ✅ All admin actions logged |
| **GDPR** - Data access tracking | ✅ User access logged with IP |
| **HIPAA** - Access logs | ✅ Role-based access tracking |
| **PCI DSS** - Activity monitoring | ✅ All mutations logged |

---

## Troubleshooting

### Audit logs not appearing in database

1. Check `AUDIT_LOGGING_FORCE_DISABLED` is not `true`
2. Check database setting via admin panel
3. Check application logs for database write errors
4. Verify `audit_logs` table exists (run migrations)

### Admin panel toggle not working

1. Check if `FORCE_*` env vars are set (they override UI)
2. Check badge message in UI for override status
3. Verify database connection

### Performance issues

1. Check database write performance
2. Consider enabling Bull Queue for async processing
3. Review audit log retention policy (archive old logs)

---

## Migration Guide

### Enabling Bull Queue Later

1. Install dependencies:
   ```bash
   npm install bull redis
   ```

2. Add environment variables:
   ```env
   USE_AUDIT_QUEUE=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password  # optional
   ```

3. Restart application (no code changes needed)

---

## API Endpoints

### Get audit logging status
```
GET /api/admin/settings/audit-logging
```

**Response:**
```json
{
  "enabled": true,
  "source": "database",  // or "force_enabled", "force_disabled", "default"
  "canChange": true
}
```

### Update audit logging status
```
PATCH /api/admin/settings/audit-logging
```

**Request:**
```json
{
  "enabled": false
}
```

**Response:**
```json
{
  "enabled": false,
  "source": "database",
  "canChange": true
}
```

**Note:** Returns `403 Forbidden` if `FORCE_*` env var is set.

---

## Code Examples

### Using in a controller

```typescript
import { getAuditLogService } from '../services/AuditLogService';

async createBook(request: UniversalRequest): Promise<ApiResponse> {
  const book = await Book.create(bookData);

  // Audit log (respects configuration automatically)
  await getAuditLogService().logActionFromRequest(
    request,
    'create',
    'book',
    String(book.id),
    { title: book.title, isbn: book.isbn }
  );

  return this.createSuccessResponse(book);
}
```

### Checking if audit logging is enabled

```typescript
import { getAuditLogService } from '../services/AuditLogService';

const isEnabled = await getAuditLogService().isEnabled();
```

---

## Related Documentation

- `libs/shared-logging/README.md` - Logging infrastructure
- `apps/api/src/services/AuditLogService.ts` - Implementation
- `apps/api/database/migrations/*-create-audit-logs-table.js` - Schema
