#!/usr/bin/env bash
# Build the page and encrypt it into index.html with StatiCrypt.
# Needs STATICRYPT_PASSWORD. Optional: LISTING_SHEET_URL, LISTING_SHEET_TOKEN.
# STATICRYPT_CMD overrides how StatiCrypt is run (default: npx staticrypt@3.5.4).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${STATICRYPT_PASSWORD:?Set STATICRYPT_PASSWORD}"
python3 build.py
rm -rf .encrypted
${STATICRYPT_CMD:-npx --yes staticrypt@3.5.4} listing-check.html \
  -p "$STATICRYPT_PASSWORD" -d .encrypted -c .staticrypt.json --remember 30 \
  --template-title "Listing check" \
  --template-instructions "Enter the password to open Listing check." \
  --template-button "Open"
mv .encrypted/listing-check.html index.html
rm -rf .encrypted listing-check.html
echo "Wrote index.html (encrypted)."
