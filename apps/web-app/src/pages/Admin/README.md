# Admin Settings Page

Admin interface for managing application settings at runtime.

## Overview

The AdminSettingsPage provides a user-friendly interface for administrators to view and modify application settings without deploying code changes.

**Location:** `/admin/settings`

**Access:** Requires admin role

## Features

### View Settings
- ✅ Display all active and inactive settings
- ✅ Group by category (UI, API, Features, Business, Security)
- ✅ Show setting key, description, current value, and default value
- ✅ Filter out deleted settings (removed from code)

### Edit Settings
- ✅ Type-appropriate edit controls:
  - **String:** Text input
  - **Number:** Number input
  - **Boolean:** Switch toggle
  - **Enum:** Select dropdown with labeled options
  - **JSON:** (Future) JSON editor
- ✅ Real-time validation
- ✅ Instant updates to application

### Toggle Active Status
- ✅ Enable/disable settings without deleting
- ✅ Visual indicator (active settings at 100% opacity, inactive at 60%)
- ✅ Disabled settings cannot be edited
- ✅ Changes apply immediately

### Visual Feedback
- ✅ Loading states during API calls
- ✅ Error messages for failed operations
- ✅ Category chips for quick identification
- ✅ Default value displayed for reference

## Usage

### Accessing the Page

1. Navigate to `/admin/settings` (or click "Settings" in admin menu)
2. Requires authentication + admin role
3. Page loads all settings (including inactive ones)

### Editing a Setting

**For Enum Settings (e.g., book list behavior):**

1. Find the setting in the list
2. Click the dropdown showing current value
3. Select new value from options
4. Change is saved automatically
5. Application behavior updates immediately

**For Boolean Settings:**

1. Find the setting
2. Toggle the switch
3. Change is saved automatically

**For Number/String Settings:**

1. Find the setting
2. Click/focus the input field
3. Enter new value
4. Press Enter or blur to save
5. Validation occurs automatically

### Toggling Active Status

1. Find the setting
2. Use the "Active"/"Inactive" toggle switch in the top-right of the setting card
3. Click to toggle between active and inactive
4. Active settings are used by the application
5. Inactive settings are ignored but can be re-enabled

### Visual Indicators

**Active Setting:**
- Full opacity (100%)
- Green "Active" label
- Edit controls enabled

**Inactive Setting:**
- Reduced opacity (60%)
- Gray "Inactive" label
- Edit controls disabled

**Category Chip:**
- Shows setting category (ui, api, features, business, security)
- Blue outline

**Default Value:**
- Shown at bottom of setting card
- Helps you know what to reset to if needed

## Settings Display

Each setting card shows:

```
┌─────────────────────────────────────────────────────┐
│ books.list.status.onchange            [ui] [Active] │
│                                                      │
│ Controls what happens to a book in the list when    │
│ its status changes.                                  │
│                                                      │
│ [Value Dropdown ▼]                                   │
│   - Remove (book disappears from list)               │
│   - Keep (book stays in list)                        │
│   - Refresh (reload entire list)                     │
│                                                      │
│ [Default: remove] [enum]                             │
└─────────────────────────────────────────────────────┘
```

## Example Use Cases

### Feature Flags

**Scenario:** Enable/disable a new feature

```
1. Find setting: features.new_ui.enabled
2. Toggle switch to "Active"
3. Feature immediately available to users
4. Toggle to "Inactive" to disable without code change
```

### UI Behavior Changes

**Scenario:** Change how book lists behave when status changes

```
1. Find setting: books.list.status.onchange
2. Current value: "remove"
3. Click dropdown, select "keep"
4. Save automatically
5. Users now see books stay in list when status changes
```

### Business Rule Adjustments

**Scenario:** Update export limit

```
1. Find setting: books.export.max_count
2. Current value: 1000
3. Change to 500
4. Save automatically
5. Users can now only export 500 books max
```

## Error Handling

### Common Errors

**403 Forbidden:**
- You don't have admin permissions
- Contact system administrator

**Network Error:**
- Connection to API failed
- Check network connection
- Try refreshing the page

**Validation Error:**
- Invalid value for setting type
- Check the allowed values/format
- Use provided controls (don't manually type enums)

### Recovery

If a setting update fails:
1. Error message displays at top of Application Settings section
2. Setting reverts to previous value
3. Try again or refresh page
4. Check browser console for details

## Technical Details

### API Endpoints Used

```
GET  /api/v1/settings/admin     - Load all settings
PATCH /api/v1/settings/admin/:key - Update setting value
PATCH /api/v1/settings/admin/:key/toggle - Toggle active status
```

### Data Flow

```
User Edit
    │
    ▼
┌─────────────────┐
│ AdminSettings   │
│ Page Component  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SettingsApi     │
│ (HTTP client)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Endpoint    │
│ /admin/:key     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SettingsService │
│ (updates cache) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database        │
│ app_settings    │
└─────────────────┘
```

After successful update:
1. Database updated
2. Backend cache refreshed
3. Frontend context refreshed
4. UI re-renders with new value
5. Application behavior changes immediately

### State Management

**Local State:**
- `appSettings`: Array of all settings
- `appSettingsLoading`: Loading indicator
- `appSettingsError`: Error message
- `updatingSettings`: Set of keys currently being updated

**Global State:**
- SettingsContext provides settings to entire app
- Refreshed after admin edits
- All components using `useSetting()` get updated value

## Files

**Component:**
- `apps/web-app/src/pages/Admin/AdminSettingsPage.tsx`

**Dependencies:**
- `apps/web-app/src/contexts/SettingsContext.tsx` - Global settings
- `apps/web-app/src/contexts/ApiContext.tsx` - API client
- `libs/shared-api/src/settings-api.ts` - HTTP client
- `libs/shared-types/src/settings/` - Type definitions

**Tests:**
- `apps/web-app/src/__tests__/pages/Admin/AdminSettingsPage.test.tsx` (12 tests)
- `apps/web-app/src/__tests__/integration/admin/admin-settings.integration.test.tsx` (7 tests)

## Best Practices

### For Administrators

1. **Test in dev/staging first** - Don't test new values in production
2. **Document changes** - Keep track of why you changed settings
3. **Know the defaults** - Defaults shown at bottom of each setting
4. **Use toggle for testing** - Disable instead of delete for reversibility
5. **Monitor impact** - Watch for user reports after changes

### For Developers

1. **Provide good descriptions** - Admins rely on these
2. **Use enums for options** - Prevents invalid values
3. **Set sensible defaults** - Should work out of the box
4. **Document in code** - Link to this README
5. **Test with various values** - Ensure settings actually work

## Troubleshooting

### Settings Not Appearing

**Cause:** Setting not defined in code or marked as deleted

**Solution:**
1. Check `libs/shared-types/src/settings/definitions.ts`
2. Ensure setting exists
3. Restart API to trigger auto-sync

### Changes Not Taking Effect

**Cause:** Frontend cache not refreshed or setting not being used

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify code actually uses the setting
4. Check setting is active (not inactive)

### Cannot Edit Setting

**Cause:** Setting is inactive

**Solution:**
1. Toggle setting to "Active" first
2. Then edit the value

### Permission Denied

**Cause:** Not logged in as admin

**Solution:**
1. Log out and log in with admin account
2. Contact administrator for admin role

## See Also

- **SettingsService README:** `apps/api/src/services/README.md` - Backend implementation
- **Settings Types README:** `libs/shared-types/src/settings/README.md` - Defining new settings
- **Developer Guide:** `docs/guides/adding-new-settings.md` - Complete walkthrough
