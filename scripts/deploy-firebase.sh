#!/usr/bin/env bash

set -euo pipefail


# Accepts a Firebase project ID OR one of the aliases from .firebaserc
# ("prod" -> kinvia-fe353, "dev" -> kinvia-dev-9368f). Defaults to prod.
PROJECT_ID="${1:-${PROJECT_ID:-prod}}"

echo "Deploying to Firebase project: ${PROJECT_ID}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

IS_DEV=false
if [[ "${PROJECT_ID}" == "dev" || "${PROJECT_ID}" == "kinvia-dev-9368f" ]]; then
  IS_DEV=true
fi

rm -rf .firebase

# `react-scripts build` always runs with NODE_ENV=production, so on its own it
# only ever reads .env.production. `build:dev` / `build:prod` use env-cmd to
# force-load .env.dev / .env.production first, so each target gets its own
# real config file (dev backend + launch gate off, or prod) instead of
# overriding vars as shell env.
#
# Note CRA's react-scripts ALSO auto-loads .env.local into every build (dev or
# prod) on top of whatever env-cmd set — dotenv only skips keys already present
# in process.env, so any VITE_* var that .env.local defines but
# .env.dev/.env.production don't will leak through. See the comments in those
# two files (e.g. VITE_SHARE_BASE_URL) for how that's guarded against.
#
# The dev Cloud Run URL in .env.dev is hardcoded (not derived from
# firebase.dev.json) because firebase.dev.json only rewrites /share/** to
# Cloud Run, not /api/** — so the frontend has to call the Cloud Run URL
# directly rather than a same-origin path.
if [[ "${IS_DEV}" == "true" ]]; then
  npm run build:dev
else
  npm run build:prod
fi

# firebase.dev.json also excludes itself from the hosting upload (unlike
# firebase.json), which prod doesn't need.
CONFIG_FILE="firebase.json"
if [[ "${IS_DEV}" == "true" ]]; then
  CONFIG_FILE="firebase.dev.json"
fi

npx --yes firebase-tools@latest deploy --only hosting --project "${PROJECT_ID}" --config "${CONFIG_FILE}"
