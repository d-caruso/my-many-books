#!/usr/bin/env bash
# Hookey handler performance benchmark
#
# Runs Newman against the Hookey-Mobile-Hooks Postman collection to measure
# handler response times and verify endpoints meet the <=5ms guardrail.
#
# Usage:
#   npm run benchmark:hookey-handlers
#
# Environment:
#   POSTMAN_ENVIRONMENT - Override the default Local-Development environment file
#
# Reports:
#   Output written to reports/hookey-handlers-*.json
#
# See also:
#   - docs/guides/mobile-hookey-integration.md (Performance Considerations)
#   - apps/api/postman/Hookey-Mobile-Hooks.postman_collection.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTION="${SCRIPT_DIR}/../apps/api/postman/Hookey-Mobile-Hooks.postman_collection.json"
REPORT_PREFIX="hookey-handlers"

ENV_FILE="${POSTMAN_ENVIRONMENT:-${SCRIPT_DIR}/../apps/api/postman/environments/Local-Development.postman_environment.json}"

bash "${SCRIPT_DIR}/newman-runner.sh" "$COLLECTION" "$REPORT_PREFIX" --environment "$ENV_FILE" "$@"
