-- Роль менеджера больше не используется: лид передаётся сразу руководителю.

-- 1. Действующих менеджеров переводим в операторы, чтобы не потерять доступы.
UPDATE "User" SET "role" = 'OPERATOR' WHERE "role" = 'MANAGER';

-- 2. Ставка выплат для этой должности больше не нужна.
DELETE FROM "PayoutRate" WHERE "role" = 'MANAGER';

-- 3. Пересоздаём перечисление без MANAGER.
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'DIRECTOR', 'HR', 'HR_OPERATOR');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OPERATOR';

ALTER TABLE "PayoutRate" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");

DROP TYPE "Role_old";
