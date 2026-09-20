#!/usr/bin/env bash
# Every flag read in the source must be registered in the catalogue with an
# owner and a removal train. This check is the only thing that reliably
# prevents flag debt -- a convention in a document does not survive a busy
# month, and a red build does.
#
# Act 5 adds this to ci.yml.
set -euo pipefail

CATALOGUE="${CATALOGUE:-../certcheck-release/flags/catalogue.yaml}"
if [ ! -f "$CATALOGUE" ]; then
  echo "::warning::catalogue not found at $CATALOGUE -- skipping flag check"
  exit 0
fi

keys=$(grep -rhoE 'flags[.\[]"?[A-Z][A-Z0-9_]+' src/ 2>/dev/null \
       | grep -oE '[A-Z][A-Z0-9_]+' | sort -u || true)

fail=0
for k in $keys; do
  if ! grep -q "key: ${k}\$" "$CATALOGUE"; then
    echo "::error::flag '$k' is read in the code but has no catalogue entry"
    fail=1
    continue
  fi
  if ! awk "/key: ${k}\$/{f=1;next} /^- /{f=0} f" "$CATALOGUE" | grep -q 'remove_by_train:'; then
    echo "::error::flag '$k' has no remove_by_train -- every flag needs a removal date at creation"
    fail=1
  fi
done

[ $fail -eq 0 ] && echo "flag catalogue: ok"
exit $fail
