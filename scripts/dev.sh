#!/usr/bin/env bash
# Start the Vite dev server (http://localhost:5173).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run dev -- "$@"
