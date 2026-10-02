/*
  Warnings:

  - A unique constraint covering the columns `[nameEn]` on the table `FoodCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nameEn]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nameEn` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FoodCategory_name_key";

-- DropIndex
DROP INDEX "Unit_name_key";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionHi" TEXT,
ADD COLUMN     "nameEn" VARCHAR(150),
ADD COLUMN     "nameHi" VARCHAR(150),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FoodCategory" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionHi" TEXT,
ADD COLUMN     "nameEn" VARCHAR(150),
ADD COLUMN     "nameHi" VARCHAR(150),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "nameEn" VARCHAR(200),
ADD COLUMN     "nameHi" VARCHAR(200),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "partyNameEn" VARCHAR(200),
ADD COLUMN     "partyNameHi" VARCHAR(200),
ALTER COLUMN "partyName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "nameEn" VARCHAR(200),
ADD COLUMN     "nameHi" VARCHAR(200),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "nameEn" VARCHAR(200) NOT NULL,
ADD COLUMN     "nameHi" VARCHAR(200),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "nameEn" VARCHAR(100),
ADD COLUMN     "nameHi" VARCHAR(100),
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FoodCategory_nameEn_key" ON "FoodCategory"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_nameEn_key" ON "Unit"("nameEn");
