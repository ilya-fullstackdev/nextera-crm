import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Режим технических работ.
 *
 * Включается двумя способами (достаточно любого):
 *  - переменная окружения `MAINTENANCE_MODE=1` (нужен перезапуск сервера);
 *  - файл-флаг `.maintenance` в корне проекта (подхватывается на лету,
 *    путь переопределяется через `MAINTENANCE_FLAG_FILE`).
 *
 * Обойти заглушку и посмотреть сайт можно, открыв любой адрес с
 * `?maintenance_bypass=<MAINTENANCE_BYPASS_TOKEN>` — токен сохранится в cookie.
 */

const FLAG_FILE =
  process.env.MAINTENANCE_FLAG_FILE ?? path.join(process.cwd(), ".maintenance");
const PAGE_FILE = path.join(process.cwd(), "public", "maintenance.html");

/** Флаг перечитываем не чаще раза в 2 с, чтобы не дёргать диск на каждый запрос. */
const FLAG_TTL_MS = 2_000;

export const BYPASS_COOKIE = "nextera_maintenance_bypass";
export const BYPASS_PARAM = "maintenance_bypass";

const FALLBACK_PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">`
  + `<meta name="viewport" content="width=device-width, initial-scale=1">`
  + `<title>Технические работы</title></head>`
  + `<body style="font-family:system-ui,sans-serif;text-align:center;padding:64px 16px">`
  + `<h1 style="font-size:20px">Ведутся технические работы</h1>`
  + `<p style="color:#64748b">Сайт скоро снова заработает.</p></body></html>`;

let flagCheckedAt = 0;
let flagValue = false;
let cachedPage: string | null = null;

function envEnabled() {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on";
}

export function isMaintenanceEnabled() {
  if (envEnabled()) return true;

  const now = Date.now();
  if (now - flagCheckedAt < FLAG_TTL_MS) return flagValue;
  flagCheckedAt = now;
  try {
    flagValue = existsSync(FLAG_FILE);
  } catch {
    flagValue = false;
  }
  return flagValue;
}

export function maintenancePage() {
  if (cachedPage !== null) return cachedPage;
  try {
    cachedPage = readFileSync(PAGE_FILE, "utf8");
  } catch {
    cachedPage = FALLBACK_PAGE;
  }
  return cachedPage;
}

export function bypassToken() {
  const token = process.env.MAINTENANCE_BYPASS_TOKEN?.trim();
  return token ? token : null;
}
