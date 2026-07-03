#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${1:-${PROJECT_ID:-kinvia-fe353}}"

echo "Deploying to Firebase project: ${PROJECT_ID}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

rm -rf .firebase
npm run build
npx --yes firebase-tools@latest deploy --only hosting --project "${PROJECT_ID}"
