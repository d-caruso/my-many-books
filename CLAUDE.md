# CLAUDE.md

This file provides comprehensive guidance to Claude Code.

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

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **STRAIGHT TO THE POINT** - Do not include unsolicited output, small talk, flattery, platitudes, or long-winded introductions.
- **Use industry standard** approach for the code, do not use workarounds unless asked for
- **Always verify file paths and module names** before use
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers (including yourself) will thank you

---