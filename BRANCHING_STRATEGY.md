# BRANCHING_STRATEGY.md

Generic Git branching strategy for this repository. All coding work — by humans and AI agents — MUST follow these rules.

---

## Branch Hierarchy

```
main
└── develop
    └── feature/<name>                        ← main feature branch
        ├── feature/<name>-Phase1-<label>     ← phase branch (for multi-phase features)
        │   ├── task/<name>-Task1.1-<label>   ← task branch
        │   └── task/<name>-Task1.2-<label>
        └── feature/<name>-Phase2-<label>
            └── task/<name>-Task2.1-<label>
```

For simple features, task branches merge directly into the feature branch — no phase branch needed.

---

## Branch Types and Naming

| Type | Pattern | Created from | Merges to |
|------|---------|-------------|-----------|
| Feature | `feature/<name>` | `develop` | `develop` |
| Phase | `feature/<name>-Phase<N>-<label>` | `feature/<name>` | `feature/<name>` |
| Task | `task/<name>-Task<N.N>-<label>` | phase or feature branch | phase or feature branch |
| Fix | `fix/<name>` | `develop` | `develop` |
| Hotfix | `hotfix/<name>` | feature branch | feature branch |
| Refactor | `refactor/<name>` | `develop` | `develop` |
| Docs | `docs/<name>` | `develop` | `develop` |

**Rules:**
- `main` and `develop` are protected — never commit directly
- Only merge to `develop` or `main` via explicit PR after confirmation
- Phase branches must be created from the feature branch **after** the previous phase is merged, unless explicitly parallel

---

## Workflow

### 1. Start Work

Always check your current branch before creating anything:

```bash
git branch
# If on develop or main — STOP. Create a branch first.
```

**Feature branch** — created from `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/<name>
```

**Phase branch** — created from its feature branch, only after the previous phase is merged:
```bash
git checkout feature/<name>
git pull origin feature/<name>
git checkout -b feature/<name>-Phase<N>-<label>
```

**Task branch** — created from its phase branch (or directly from the feature branch for simple features):
```bash
git checkout feature/<name>-Phase<N>-<label>
git pull origin feature/<name>-Phase<N>-<label>
git checkout -b task/<name>-Task<N.N>-<label>
```

**Fix / Refactor / Docs branch** — created from `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b fix/<name>
```

**Hotfix branch** — created from the feature branch it targets:
```bash
git checkout feature/<name>
git checkout -b hotfix/<description>
```

### 2. Commit Format

```
[TASK] <N.N> <short description>
[FIX]  <N.N> <short description>
[TEST] <N.N> <short description>
[DOCS] <N.N> <short description>
[HOTFIX] <short description>
```

- Max 6 lines per commit message
- No reference to AI tools in commit messages
- One logical change per commit

### 3. Pre-Merge Checks

Run checks **in this order**, one at a time — **wait for each to complete before starting the next**:

```bash
# 1. Build — only the package containing the changed file
cd <package> && npm run build

# 2. Type check
cd <package> && npm run typecheck

# 3. Lint
cd <package> && npm run lint

# 4a. Tests — only the specific test file(s) for what changed
cd <package> && npm test -- <path/to/specific.test.ts>

# 4b. If 4a passes — run the full package test suite
cd <package> && npm test
```

**Never run checks on the whole codebase or a whole folder at once.**
**Always wait for a run to finish before starting the next one.**
**All checks must pass (0 errors, 0 failures) before creating a PR.**

### 4. Create PR and Merge

```bash
# Push branch
git push origin task/<name>-Task<N.N>-<label>

# PR title format:
# "[TASK N.N] Short description"
# "[PHASE N] Short description"
# "[FEATURE] Short description"

# After approval, merge to parent branch
git checkout <parent-branch>
git merge task/<name>-Task<N.N>-<label>
git push origin <parent-branch>
```

---

## Testing Strategy

- Write tests for each task that introduces logic — not as an afterthought
- For simple tasks: tests in the same task branch
- For complex phases: tests can be a dedicated task at the end of the phase
- Run only the test file(s) for changed code — never the full suite
- Wait for the test run to finish before running any other check

---

## Parallel Development

Phases with no shared dependencies can run in parallel. Phases with dependencies must be sequential — always create a phase branch from the feature branch **after** the previous phase is merged.

---

## Emergency Procedures

### Critical Bug in Feature Branch

```bash
git checkout feature/<name>
git checkout -b hotfix/<description>
# Fix, commit, run pre-merge checks
git checkout feature/<name>
git merge hotfix/<description>
git push origin feature/<name>
```

### Rollback a Merged Phase

```bash
git checkout feature/<name>
git revert -m 1 <merge-commit-hash>
git push origin feature/<name>
```

---

## Quality Gates (Non-Negotiable)

- No workarounds — use industry standard solutions
- No lint suppressions (`// eslint-disable`, `@ts-ignore`, `// noqa`) without a written justification in the same line
- No skipping type checks
- No direct commits to `develop` or `main`
- No merging with failing tests, failing lint, or failing typecheck
- When in doubt about approach — **stop and ask** before writing code

---

## Docs Submodule

The `docs/` folder is a Git submodule (separate repository). Always navigate into it before running git commands — never use `git -C docs/`.

```bash
cd docs
git checkout feature/<branch-name>
# make changes
git add <files>
git commit -m "[DOCS] description"
git push origin feature/<branch-name>
cd ..
git add docs
git commit -m "[SUBMODULE] update docs reference"
```
