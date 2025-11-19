# CLAUDE.md

This file provides comprehensive guidance to Claude Code.

## BEFORE STARTING ANY WORK - MANDATORY CHECKLIST
  - [ ] Am I on develop or main? If YES -> STOP and create a branch
  - [ ] Have I created a feature/fix/refactor/* branch?
  - [ ] Branch name format: feature/*, fix/*, refactor/*, docs/*

## ⚠️ CRITICAL - BRANCH WORKFLOW (VIOLATION = FAILURE)

**YOU MUST NEVER COMMIT DIRECTLY TO `develop` OR `main`**
Before typing ANY git command:
  1. Run `git branch` - check current branch
  2. If on `develop` or `main` -> CREATE A NEW BRANCH IMMEDIATELY
  3. ALL work must be on feature/fix/refactor/* branches
  4. Only merge to develop via explicit merge command

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)

Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)

Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.

### Design Principles

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

### Branch Strategy

- `main` - Production-ready code. Never work directly on this branch.
- `develop` - Integration branch for features. Never work directly on this branch.
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring

### Commit Messages

- Never include any reference to Claude Code in commit messages
- max 6 lines of text

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
- **STRAIGHT TO THE POINT** - Do not include unsolicited output, small talk, flattery, platitudes, or long-winded introductions.
- **FIX ISSUES AND BUGS PROPERLY** - not quickly.
- **Use industry standard** approach for the code, do not use workarounds unless asked for
- **Always verify file paths and module names** before use
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers (including yourself) will thank you

---