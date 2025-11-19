# Update Documentation After Task Completion

You just completed work on a feature or task. This command helps ensure all documentation is updated to reflect the changes.

## Instructions

Follow these steps to update all relevant documentation:

### Step 1: Identify What Changed

Ask yourself:
- Did I modify the architecture? (new libraries, API endpoints, middleware, data flows)
- Did I fix a gap from GAPS_AND_IMPROVEMENTS.md?
- Did I add/complete a feature?
- Did I change database schema or configuration?
- Did I modify environment variables?

### Step 2: Read Recent Git Changes

```bash
# Check what files were changed
git log --oneline -5
git diff HEAD~1 --name-only
```

Identify the scope of changes to determine which docs need updates.

### Step 3: Update Documentation Files

Based on what changed, update the relevant files:

#### A) ARCHITECTURE_OVERVIEW.md

**Update if you changed:**
- API endpoints (add to API Routes table)
- Middleware (update middleware pipeline)
- Shared libraries (update dependency graph)
- Database schema (update schema section)
- Authentication/Authorization flows (update flow diagrams)
- Data flows (update data flow sections)
- Technology stack

**Location:** `docs/ARCHITECTURE_OVERVIEW.md`

**What to update:**
- Find the relevant section (use Table of Contents)
- Add/modify the specific subsection
- Update any diagrams if architecture changed
- Verify dates: Update "Last Updated" to today

#### B) GAPS_AND_IMPROVEMENTS.md

**Update if you:**
- Fixed a critical gap (mark as resolved, move to note)
- Discovered a new gap (add to appropriate section)
- Changed priorities (update priority indicators)
- Completed an improvement from the backlog (mark as done)

**Location:** `docs/GAPS_AND_IMPROVEMENTS.md`

**What to update:**
- **If gap fixed:** Move from "Not Implemented" to "Critical Gaps" with note
- **If new gap found:** Add to appropriate priority section
- **Update checklist:** Mark items as resolved in "Known Issues Checklist"
- **Update roadmap:** Adjust "Implementation Roadmap" if priorities changed
- Verify dates: Update "Last Updated" to today

#### C) CONTEXT.md

**Always update this file** - it tracks recent changes.

**Location:** `docs/CONTEXT.md`

**What to update:**
1. **Recent Changes section:**
   - Add new entry at the top
   - Format: `[Date] - [Type] - [Description]`
   - Include file paths affected
   - **Keep only last 5 entries** (remove oldest)

2. **Known Issues Checklist:**
   - Check boxes for resolved issues
   - Remove items that are fully complete

3. **Next Priorities:**
   - Update if priorities changed
   - Mark completed items

4. Verify dates: Update "Last Updated" to today

#### D) QUICK_START.md

**Update if you:**
- Completed a major feature (mark in "Current Status" table)
- Fixed a critical gap (remove from "Critical Gaps" section)
- Changed key file paths
- Modified common commands or environment variables

**Location:** `docs/QUICK_START.md`

**What to update:**
- **Current Status table:** Change ❌ to ✅ if feature completed
- **Critical Gaps table:** Remove resolved gaps
- **Key File Paths:** Add new important files
- Verify dates: Update "Last Updated" to today

#### E) docs/README.md

**Update if you:**
- Completed a major feature (update status tables)
- Changed documentation structure

**Location:** `docs/README.md`

**What to update:**
- **Implemented Features table:** Add completed features
- **Not Implemented table:** Remove completed items
- Verify dates: Update "Last Updated" to today

### Step 4: Verify Consistency

Check that all documentation files are consistent:

- [ ] ARCHITECTURE_OVERVIEW.md reflects current state
- [ ] GAPS_AND_IMPROVEMENTS.md shows gap as resolved (if applicable)
- [ ] CONTEXT.md "Recent Changes" updated (last 5 only)
- [ ] CONTEXT.md "Known Issues Checklist" updated
- [ ] QUICK_START.md "Current Status" accurate
- [ ] README.md status tables updated
- [ ] All "Last Updated" dates are today's date (2025-11-19 or current)
- [ ] No broken links between documentation files
- [ ] Diagrams updated if architecture changed

### Step 5: Commit Documentation Changes

**⚠️ IMPORTANT: `docs/` is a git submodule (separate repository).**

**You MUST commit from within the `docs/` directory:**

```bash
# 1. Navigate to docs folder
cd /path/to/my-many-books/docs

# 2. Stage all changes
git add .

# 3. Commit with proper message
git commit -m "docs: update documentation for [feature/change description]"

# 4. Push to docs repository
git push origin feature/branch-name
```

**❌ WRONG - Don't do this:**
```bash
cd /path/to/my-many-books
git add docs/  # Won't work - docs is in .gitignore
git commit -m "update docs"
```

**Commit message format:**
- Prefix with `docs:`
- Be specific about what was documented
- Max 6 lines

**Examples:**
- `docs: update architecture for authorization implementation`
- `docs: mark DB connection pool gap as resolved`
- `docs: add shared-auth library to architecture overview`

**Note:** The `docs/` folder is in the main project's `.gitignore`, so documentation changes are only tracked in the separate docs repository.

---

## Example Usage

**Scenario:** You just implemented authorization using CASL

**You would:**

1. **Update ARCHITECTURE_OVERVIEW.md:**
   - Add authorization flow diagram
   - Update middleware section (requirePermission now functional)
   - Update security architecture section

2. **Update GAPS_AND_IMPROVEMENTS.md:**
   - Remove "Authorization NOT enforced" from Critical Gaps
   - Add note: "Resolved 2025-11-19 - Implemented CASL-based RBAC"
   - Update Known Issues Checklist (uncheck authorization box)

3. **Update CONTEXT.md:**
   - Add to Recent Changes: `2025-11-19 - FEATURE - Implemented authorization with CASL`
   - Update Authorization Status section (change from ❌ to ✅)
   - Update Known Issues Checklist (check authorization box)

4. **Update QUICK_START.md:**
   - Change Authorization status from ❌ to ✅
   - Remove from "Critical Gaps" section

5. **Update docs/README.md:**
   - Move Authorization from "Not Implemented" to "Implemented Features"

6. **Commit:**
   ```bash
   git add docs/
   git commit -m "docs: update documentation for authorization implementation

   - Added CASL-based RBAC authorization flow
   - Marked critical authorization gap as resolved
   - Updated all status tables"
   ```

---

## Quick Checklist

Use this quick checklist after completing any feature:

```
[ ] Read recent git changes (git log, git diff)
[ ] Identify what changed (architecture, gaps, features)
[ ] Update ARCHITECTURE_OVERVIEW.md (if architecture changed)
[ ] Update GAPS_AND_IMPROVEMENTS.md (if gap fixed/added)
[ ] Update CONTEXT.md Recent Changes (ALWAYS - keep last 5)
[ ] Update CONTEXT.md Known Issues (if issues resolved)
[ ] Update QUICK_START.md (if major feature or critical gap)
[ ] Update README.md (if major feature)
[ ] Verify all dates updated to today
[ ] Verify no broken links
[ ] Commit with docs: prefix
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Skip CONTEXT.md Recent Changes (always update this)
- Forget to update "Last Updated" dates
- Leave broken links between docs
- Update only one file when multiple need updates
- Batch documentation commits with code commits

✅ **Do:**
- Update all affected documentation files
- Keep CONTEXT.md Recent Changes to 5 items max
- Commit docs separately from code
- Verify consistency across all docs
- Update dates to today

---

## Need Help?

**If you're unsure what to update:**
1. Check CLAUDE.md "Documentation Update Triggers" section
2. Ask: "Which documentation files need updating for [your change]?"

**If you're unsure how to describe the change:**
1. Look at existing entries in CONTEXT.md Recent Changes
2. Follow the format: `[Date] - [Type] - [Description]`
3. Types: FEATURE, FIX, REFACTOR, DOCS, PERF, TEST

---

**This is a convenience tool. The FULL documentation policy is in CLAUDE.md.**
