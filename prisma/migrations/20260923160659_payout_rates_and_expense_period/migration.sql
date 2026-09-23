/*
  Warnings:

  - You are about to drop the column `monthlyAmount` on the `ProjectExpense` table. All the data in the column will be lost.
  - Added the required column `amount` to the `ProjectExpense` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExpensePeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "ProjectExpense" DROP COLUMN "monthlyAmount",
ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "period" "ExpensePeriod" NOT NULL DEFAULT 'MONTHLY';

-- CreateTable
CREATE TABLE "PayoutRate" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "finderPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recruiterPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRate_role_key" ON "PayoutRate"("role");
