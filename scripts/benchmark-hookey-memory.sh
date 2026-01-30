#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TS_NODE_PROJECT="${ROOT_DIR}/tsconfig.base.json"

npx ts-node --project "${TS_NODE_PROJECT}" "${SCRIPT_DIR}/benchmark-hookey-memory.ts" "$@"
