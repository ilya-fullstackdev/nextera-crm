#!/usr/bin/env bash
# Ручное управление режимом технических работ.
#   ./scripts/maintenance.sh on      — включить заглушку
#   ./scripts/maintenance.sh off     — выключить
#   ./scripts/maintenance.sh status  — показать текущее состояние
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLAG="${MAINTENANCE_FLAG_FILE:-$ROOT/.maintenance}"

case "${1:-status}" in
  on)
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$FLAG"
    echo "Режим техработ ВКЛЮЧЁН ($FLAG)"
    ;;
  off)
    rm -f "$FLAG"
    echo "Режим техработ ВЫКЛЮЧЕН"
    ;;
  status)
    if [ -f "$FLAG" ]; then
      echo "Режим техработ ВКЛЮЧЁН с $(cat "$FLAG")"
    else
      echo "Режим техработ выключен"
    fi
    ;;
  *)
    echo "Использование: $0 {on|off|status}" >&2
    exit 1
    ;;
esac
