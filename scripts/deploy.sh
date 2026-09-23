#!/usr/bin/env bash
# Деплой новой версии CRM на сервере.
#
# Порядок: заглушка -> обновление кода -> миграции -> сборка -> рестарт ->
# проверка -> снятие заглушки. Если что-то упало, заглушка остаётся включённой.
#
# Настройки через переменные окружения:
#   RESTART_CMD  команда перезапуска приложения (по умолчанию pm2)
#   PORT         порт, на котором слушает next start (по умолчанию 3000)
#   SKIP_GIT=1   не делать git pull (код обновляется другим способом)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RESTART_CMD="${RESTART_CMD:-pm2 restart nextera-crm --update-env}"
PORT="${PORT:-3000}"
HEALTH_URL="http://127.0.0.1:${PORT}/login"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

log() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

on_failure() {
  echo
  echo "!! Деплой прерван. Режим техработ оставлен ВКЛЮЧЁННЫМ."
  echo "!! Почините ошибку и запустите деплой заново,"
  echo "!! либо снимите заглушку вручную: ./scripts/maintenance.sh off"
}
trap on_failure ERR

log "Включаю режим технических работ"
"$ROOT/scripts/maintenance.sh" on
# Даём уже начатым запросам завершиться.
sleep 2

if [ "${SKIP_GIT:-0}" != "1" ]; then
  log "Обновляю код"
  git pull --ff-only
fi

log "Устанавливаю зависимости"
npm ci

log "Применяю миграции базы данных"
npx prisma migrate deploy
npx prisma generate

log "Собираю новую версию"
npm run build

log "Перезапускаю приложение"
eval "$RESTART_CMD"

log "Жду, пока приложение поднимется"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
until curl -fsS -o /dev/null -w '%{http_code}' "$HEALTH_URL" | grep -qE '^(200|503)$'; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Приложение не ответило за ${HEALTH_TIMEOUT} с" >&2
    exit 1
  fi
  sleep 2
done

log "Снимаю режим технических работ"
"$ROOT/scripts/maintenance.sh" off

code=$(curl -fsS -o /dev/null -w '%{http_code}' "$HEALTH_URL")
if [ "$code" != "200" ]; then
  echo "Сайт отвечает кодом $code вместо 200" >&2
  exit 1
fi

trap - ERR
log "Готово: новая версия работает"
