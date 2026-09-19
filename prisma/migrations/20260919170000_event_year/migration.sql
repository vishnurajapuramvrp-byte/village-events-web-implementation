-- AlterTable
ALTER TABLE "Event" ADD COLUMN "year" INTEGER NOT NULL DEFAULT 2026;

-- CreateIndex
CREATE INDEX "Event_villageId_year_idx" ON "Event"("villageId", "year");
