#!/usr/bin/env bash
# Builds and deploys plant-care to Vercel (production).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Deploying to Vercel (production)"
vercel deploy --prod
