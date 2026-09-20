#!/usr/bin/env bash
# New migrations must be expand-only unless they carry an explicit,
# attributable waiver. Expand now, migrate next train, contract the train
# after -- so that at every point the schema works with the release already
# running in production, and a rollback stays possible.
#
# Act 7 adds this to ci.yml.
set -euo pipefail

git fetch -q origin dev 2>/dev/null || true
base=$(git merge-base origin/dev HEAD 2>/dev/null || echo "")
[ -z "$base" ] && { echo "no merge base with origin/dev -- skipping"; exit 0; }

changed=$(git diff --name-only "$base"...HEAD -- 'migrations/*.sql' || true)
[ -z "$changed" ] && { echo "no migration changes"; exit 0; }

fail=0
for f in $changed; do
  [ -f "$f" ] || continue
  if grep -Eiq '\b(DROP[[:space:]]+(TABLE|COLUMN)|RENAME[[:space:]]+(COLUMN|TO)|NOT[[:space:]]+NULL)\b' "$f"; then
    if ! grep -q 'CONTRACT-WAIVER:' "$f"; then
      echo "::error file=$f::Destructive statement with no CONTRACT-WAIVER."
      echo "  Expand-and-contract: add the new shape now, migrate next train, drop the train after."
      echo "  If this really must be destructive, add a line:"
      echo "  -- CONTRACT-WAIVER: <reason>, approved by <name>"
      fail=1
    else
      echo "::warning file=$f::destructive migration proceeding under a recorded waiver"
    fi
  fi
done

[ $fail -eq 0 ] && echo "migrations: expand-only ok"
exit $fail
