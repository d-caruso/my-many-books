# CLAUDE.md

This file provides comprehensive guidance to Claude Code.

## BEFORE STARTING ANY WORK - MANDATORY CHECKLIST
  - [ ] Am I on develop or main? If YES -> STOP and create a branch
  - [ ] Have I created a branch following the naming rules in [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)?
  - [ ] Branch name format: `feature/*`, `task/*`, `fix/*`, `hotfix/*`, `refactor/*`, `docs/*`

## ⚠️ CRITICAL - BRANCH WORKFLOW (VIOLATION = FAILURE)

**Full branching rules are defined in [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md). Read and follow it.**

**YOU MUST NEVER COMMIT DIRECTLY TO `develop` OR `main`**
Before typing ANY git command:
  1. Run `git branch` - check current branch
  2. If on `develop` or `main` -> CREATE A NEW BRANCH IMMEDIATELY
  3. ALL work must be on `feature/*`, `task/*`, `fix/*`, `hotfix/*`, `refactor/*`, or `docs/*` branches
  4. If any branch-naming rules conflict, STOP and ask before running any git command
  5. Only merge to develop and to main after asking confirmation via explicit merge command
  6. Only merge to develop and to main via explicit merge command

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)

Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)

Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.

### Design Principles

- **DRY (Don't Repeat Yourself)**: Every piece of knowledge must have a single, authoritative representation. Extract shared logic; never duplicate.
- **Dependency Inversion**: High-level modules should not depend on low-level modules. Both should depend on abstractions.
- **Open/Closed Principle**: Software entities should be open for extension but closed for modification.
- **Single Responsibility**: Each function, class, and module should have one clear purpose.
- **Fail Fast**: Check for potential errors early and raise exceptions immediately when issues occur.

## 🧱 Code Structure & Modularity

### File and Function Limits

- **Never create a file longer than 500 lines of code**. If approaching this limit, refactor by splitting into modules.
- **Functions should be under 50 lines** with a single, clear responsibility.
- **Classes should be under 100 lines** and represent a single concept or entity.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.

## 🔄 Git Workflow

See [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md) for the full branching strategy, workflow, and quality gates.

### Branch Types

- `main` - Production-ready code. Never work directly on this branch.
- `develop` - Integration branch. Never work directly on this branch.
- `feature/<name>` - New features (merges to `develop`)
- `feature/<name>-Phase<N>-<label>` - Phase branch within a large feature
- `task/<name>-Task<N.N>-<label>` - Task branch within a phase or feature
- `fix/<name>` - Bug fixes
- `hotfix/<name>` - Critical fixes within a feature branch
- `refactor/<name>` - Code refactoring
- `docs/<name>` - Documentation updates

### Commit Messages

- Never include any reference to AI tools in commit messages
- Max 6 lines of text
- Format: `[TASK]`, `[FIX]`, `[TEST]`, `[DOCS]`, `[HOTFIX]`

### Pre-Merge Checks (run per changed package, in order, one at a time)

1. `npm run build` — wait for completion
2. `npm run typecheck` — wait for completion
3. `npm run lint` — wait for completion
4. `npm test -- <specific-test-file>` — run only tests for changed files; if passing, run `npm test` on the full package

**Never run checks on the whole codebase. Always wait for each run to finish before starting the next.**

## 📚 DOCUMENTATION UPDATE POLICY

**CRITICAL: After completing ANY task that involves code changes, you MUST update documentation.**

### Quick Context Files (Read These First)

**Every new session, read these files for context:**
1. `docs/QUICK_START.md` (150 lines) - Instant project overview
2. `docs/CONTEXT.md` (250 lines) - Detailed context

**For deeper understanding:**
3. `docs/ARCHITECTURE_OVERVIEW.md` (600 lines) - Full architecture
4. `docs/GAPS_AND_IMPROVEMENTS.md` (500 lines) - Known issues & improvements

### Automatic Documentation Updates

When you complete a task, ALWAYS check if updates are needed:

**1. Architecture Changes → Update `docs/ARCHITECTURE_OVERVIEW.md`**
   - New libraries, API endpoints, data flows, middleware
   - Database schema changes
   - Technology stack changes
   - Infrastructure changes

**2. Gaps Fixed/Added → Update `docs/GAPS_AND_IMPROVEMENTS.md`**
   - Mark items as completed (move from "Not Implemented")
   - Update priorities if status changed
   - Add newly discovered gaps
   - Update implementation roadmap

**3. New Features → Update `docs/README.md`**
   - Update status tables
   - Add to implemented features list
   - Update "Last Updated" date

**4. AI Context → Update `docs/CONTEXT.md`**
   - Add to "Recent Changes" section (keep last 5 only)
   - Update "Known Issues Checklist" if issues resolved
   - Update "Next Priorities" if priorities changed

**5. Quick Context → Update `docs/QUICK_START.md`**
   - Update "Current Status" section if major feature completed
   - Update "Critical Gaps" if critical issues resolved
   - Update "Key File Paths" if structure changed

### Documentation Update Triggers

Update docs if you:
- ✅ Add/modify API endpoints
- ✅ Create/modify middleware
- ✅ Add/modify shared libraries
- ✅ Implement authentication/authorization features
- ✅ Fix a gap from GAPS_AND_IMPROVEMENTS.md
- ✅ Change database schema/config
- ✅ Add/modify data flows
- ✅ Complete a feature from planning/
- ✅ Change environment variables
- ✅ Modify deployment/infrastructure

### How to Update Documentation

**At the END of every feature/task completion:**

1. Before marking final todo as complete:
   - Read relevant sections of current documentation
   - Identify what changed (architecture, gaps, flows)
   - Update all affected documentation files

2. Include documentation updates in your final todo:
   ```
   Example todo list:
   - [completed] Implement authorization with CASL
   - [completed] Add permission caching
   - [completed] Write tests for authorization
   - [in_progress] Update docs/ARCHITECTURE_OVERVIEW.md for authorization
   - [pending] Update docs/GAPS_AND_IMPROVEMENTS.md (remove gap #1)
   - [pending] Update docs/CONTEXT.md recent changes
   ```

3. Commit documentation separately:
   ```bash
   git add docs/
   git commit -m "docs: update architecture for authorization implementation"
   ```

### Documentation Update Checklist

After completing a feature, verify:
- [ ] ARCHITECTURE_OVERVIEW.md reflects current architecture
- [ ] GAPS_AND_IMPROVEMENTS.md shows gap as resolved (if applicable)
- [ ] CONTEXT.md "Recent Changes" updated (keep last 5)
- [ ] CONTEXT.md "Known Issues Checklist" updated
- [ ] QUICK_START.md "Current Status" accurate
- [ ] README.md status tables updated
- [ ] All "Last Updated" dates changed to today
- [ ] No broken links between documentation files

**NEVER mark a feature task as complete without updating documentation.**

---

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **STRAIGHT TO THE POINT** - Do not include unsolicited output, small talk, flattery, platitudes, or long-winded introductions. (e.g.: no things like "Excellent questions" or " Let me investigate")
- **FIX ISSUES AND BUGS PROPERLY** - not quickly.
- **Use industry standard** approach for the code, do not use workarounds unless asked for
- **Always verify file paths and module names** before use
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers (including yourself) will thank you
- **Reuse before creating** - Check `libs/shared-contracts`, `libs/shared-utils`, and other libs for existing constants, types, and interfaces before defining new ones
- **No hardcoded user-facing strings** - All text shown to the user must use translation keys from `libs/shared-i18n`

---