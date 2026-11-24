#!/usr/bin/env bash
# Typecheck and produce a production build in dist/.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
