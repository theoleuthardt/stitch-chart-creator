#!/usr/bin/env bash
# Moves the card of an issue to a column of the project board and adds it first if needed.
# Usage: scripts/kanban-status.sh <issue> <backlog|ready|progress|review|done>
set -euo pipefail

issue=${1:?issue number}

case ${2:?column} in
  backlog) option=f75ad846 ;;
  ready) option=61e4505c ;;
  progress) option=47fc9ee4 ;;
  review) option=df73e18b ;;
  done) option=98236657 ;;
  *) echo "unknown column: $2" >&2; exit 1 ;;
esac

item=$(gh project item-add 5 --owner theoleuthardt \
  --url "https://github.com/theoleuthardt/stitch-chart-creator/issues/$issue" \
  --format json --jq .id)
gh project item-edit --project-id PVT_kwHOA5wDoM4Bp6RZ --id "$item" \
  --field-id PVTSSF_lAHOA5wDoM4Bp6RZzhoTsyE --single-select-option-id "$option" >/dev/null
echo "#$issue -> $2"
