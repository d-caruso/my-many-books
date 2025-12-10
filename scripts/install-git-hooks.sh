#!/bin/bash

# Install git hooks to protect auto-generated files

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Installing git hooks...${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/usr/bin/env bash

# Pre-commit hook to prevent committing auto-generated translation files

staged_files=$(git diff --cached --name-only)

# Check for web-app translation files (excluding README.md)
web_app_translations=$(echo "$staged_files" | grep -E '^apps/web-app/public/locales/.*\.json$' || true)

if [ -n "$web_app_translations" ]; then
    echo ""
    echo "❌ ERROR: You are trying to commit translation files in apps/web-app/public/locales/"
    echo ""
    echo "These files are AUTO-GENERATED and should NOT be edited directly!"
    echo ""
    echo "Files being committed:"
    echo "$web_app_translations" | sed 's/^/  /'
    echo ""
    echo "✅ CORRECT WAY: Edit translations in libs/shared-i18n/src/locales/ instead"
    echo ""
    echo "Example:"
    echo "  1. Edit: libs/shared-i18n/src/locales/en/common.json"
    echo "  2. Run: npm run sync-translations"
    echo "  3. Commit the source file in libs/shared-i18n/"
    echo ""
    echo "To force commit these files anyway (not recommended):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi

exit 0
EOF

# Make hook executable
chmod +x "$HOOKS_DIR/pre-commit"

echo -e "${GREEN}✓ Git hooks installed successfully!${NC}"
echo -e "${GREEN}  Location: $HOOKS_DIR/pre-commit${NC}"
echo ""
echo -e "${YELLOW}Protected files:${NC}"
echo -e "${YELLOW}  - apps/web-app/public/locales/*.json (auto-generated)${NC}"
echo ""
echo -e "${YELLOW}Note: This hook prevents committing auto-generated translation files.${NC}"
echo -e "${YELLOW}      Edit translations in libs/shared-i18n/src/locales/ instead.${NC}"
