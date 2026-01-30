#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTION="${SCRIPT_DIR}/../apps/api/postman/Hookey-Queue-Sync.postman_collection.json"
REPORT_PREFIX="hookey-queue-sync"

ENV_FILE="${POSTMAN_ENVIRONMENT:-${SCRIPT_DIR}/../apps/api/postman/environments/Local-Development.postman_environment.json}"

bash "${SCRIPT_DIR}/newman-runner.sh" "$COLLECTION" "$REPORT_PREFIX" --environment "$ENV_FILE" "$@"
