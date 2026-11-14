#!/usr/bin/env bash
# Reset repository and database to clean baseline (FR-RT-07)

set -e

echo "Resetting KiranaKart Secure repository to baseline..."

# Revert any injected flaw patches
node tools/inject.js --revert

# Reset git working tree if git repo initialized
if [ -d ".git" ]; then
  git checkout -- . || true
  git clean -fd || true
fi

# Reset SQLite database to fresh state if exists
if [ -f "kiranakart.db" ]; then
  echo "Re-initializing database from seed..."
  rm -f kiranakart.db*
  node -e "require('./backend/src/repositories/db'); console.log('Database initialized.');"
fi

echo "Repository and database reset to clean baseline."
