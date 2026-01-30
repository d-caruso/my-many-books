#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <collection-file> <report-prefix> [--environment <env-file>] [extra newman args]"
  exit 1
fi

COLLECTION_FILE="$1"
REPORT_PREFIX="$2"
shift 2

ENV_FILE="${POSTMAN_ENVIRONMENT:-apps/api/postman/environments/Local-Development.postman_environment.json}"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --environment)
      if [ "$#" -lt 2 ]; then
        echo "--environment requires a value"
        exit 1
      fi
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ ! -f "$COLLECTION_FILE" ]; then
  echo "Collection not found: $COLLECTION_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

REPORT_DIR="reports/newman"
mkdir -p "$REPORT_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BASE_PATH="$REPORT_DIR/${REPORT_PREFIX}-${TIMESTAMP}"

echo "Running Newman benchmark for ${COLLECTION_FILE}"
if [ "${#EXTRA_ARGS[@]}" -gt 0 ]; then
  npx newman run "$COLLECTION_FILE" \
    --environment "$ENV_FILE" \
    --reporters cli,json,html \
    --reporter-json-export "${BASE_PATH}.json" \
    --reporter-html-export "${BASE_PATH}.html" \
    "${EXTRA_ARGS[@]}"
else
  npx newman run "$COLLECTION_FILE" \
    --environment "$ENV_FILE" \
    --reporters cli,json,html \
    --reporter-json-export "${BASE_PATH}.json" \
    --reporter-html-export "${BASE_PATH}.html"
fi

echo "Reports written to ${BASE_PATH}.{json,html}"
