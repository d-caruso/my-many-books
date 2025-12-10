#!/bin/bash

# Sync translations from shared-i18n to web-app
# This ensures web-app always has the latest translations from the source of truth

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Syncing translations from shared-i18n to web-app...${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source and destination paths
SOURCE_DIR="$PROJECT_ROOT/libs/shared-i18n/src/locales"
DEST_DIR="$PROJECT_ROOT/apps/web-app/public/locales"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Sync translations (one-way: source -> destination)
# -a: archive mode (preserves timestamps, permissions)
# -v: verbose
# --delete: delete files in destination that don't exist in source
# --exclude: don't delete README.md in destination
rsync -av --delete --exclude='README.md' "$SOURCE_DIR/" "$DEST_DIR/"

# Check rsync exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Translations synced successfully!${NC}"
    echo -e "${GREEN}  Source: $SOURCE_DIR${NC}"
    echo -e "${GREEN}  Destination: $DEST_DIR${NC}"
else
    echo -e "${RED}✗ Error syncing translations${NC}"
    exit 1
fi

# Show what was synced
echo ""
echo -e "${YELLOW}Translation files:${NC}"
find "$DEST_DIR" -name "*.json" -type f | sed "s|$DEST_DIR/||" | sort

echo ""
echo -e "${YELLOW}⚠️  Remember: Only edit translations in libs/shared-i18n/src/locales/${NC}"
echo -e "${YELLOW}   Changes in apps/web-app/public/locales/ will be overwritten!${NC}"
