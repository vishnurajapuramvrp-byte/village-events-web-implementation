ALTER TABLE "User" ADD COLUMN "mobile" TEXT;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");