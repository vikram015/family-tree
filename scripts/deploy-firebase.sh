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

# `react-scripts build` always runs with NODE_ENV=production, so it only ever
# reads .env.production — .env.development is never consulted here, no matter
# which Firebase project we're deploying to. To make the dev deploy skip the
# launch gate, override it as a real shell env var: CRA's dotenv loader never
# overwrites a variable that's already set in process.env, so this wins over
# whatever .env.production has.
if [[ "${IS_DEV}" == "true" ]]; then
  REACT_APP_COMING_SOON=false npm run build
else
  npm run build
fi

# firebase.dev.json also excludes itself from the hosting upload (unlike
# firebase.json), which prod doesn't need.
CONFIG_FILE="firebase.json"
if [[ "${IS_DEV}" == "true" ]]; then
  CONFIG_FILE="firebase.dev.json"
fi

npx --yes firebase-tools@latest deploy --only hosting --project "${PROJECT_ID}" --config "${CONFIG_FILE}"
