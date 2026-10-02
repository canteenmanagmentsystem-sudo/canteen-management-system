/*
  Warnings:

  - Made the column `nameEn` on table `Department` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameEn` on table `FoodCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameEn` on table `FoodItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `partyNameEn` on table `Party` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameEn` on table `Person` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameEn` on table `Unit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "nameEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "FoodCategory" ALTER COLUMN "nameEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "FoodItem" ALTER COLUMN "nameEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Party" ALTER COLUMN "partyNameEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Person" ALTER COLUMN "nameEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "nameEn" SET NOT NULL;
