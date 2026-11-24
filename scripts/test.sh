#!/usr/bin/env bash
# Run the unit test suite once (Vitest).
set -euo pipefail
cd "$(dirname "$0")/.."
npm test -- "$@"
