#!/bin/sh
# Builds the app and runs the whole thing over HTTP against an in-memory database, so Neon is not needed.
# Usage (from the project folder): sh tests/e2e/run.sh
export DATABASE_URL=postgresql://x:y@h/db DIRECT_URL=postgresql://x:y@h/db SESSION_SECRET=testsecret
export NODE_OPTIONS="--require $(pwd)/tests/e2e/fakedb.cjs"
npx next build || exit 1
npx next start -p 3100 >/dev/null 2>&1 &
trap 'pkill -f "next start -p 3100" 2>/dev/null; pkill -f next-server 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/login && break; sleep 1; done
node tests/e2e/run.mjs
