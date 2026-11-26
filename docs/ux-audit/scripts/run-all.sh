#!/bin/sh
# Repeat the whole audit against a running production server (npm run build && npm start -- -p 3002).
# Usage: AUDIT_TAG=after sh run-all.sh
set -e
cd "$(dirname "$0")"
TAG="${AUDIT_TAG:-after}"
export AUDIT_TAG="$TAG"
node crawl.mjs
node summarize.mjs "$TAG" > /dev/null
node lighthouse.mjs --runs=3
node seo.mjs > /dev/null
node links.mjs > /dev/null
node special.mjs > /dev/null
node lcp.mjs > "../results/$TAG/lcp.txt"
echo "audit $TAG finished"
