-- Vehicle details move from inline columns on `orders` to a child table, so
-- an order shipping several vehicles can carry a VIN per vehicle rather than
-- one VIN for the whole order. Order matters here: the new table is created
-- and back-filled from the existing columns BEFORE those columns are dropped,
-- so no vehicle data is lost.

-- CreateTable
CREATE TABLE "order_vehicles" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "colour" TEXT,
    "vin" TEXT,
    "engine_no" TEXT,

    CONSTRAINT "order_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_vehicles_vin_key" ON "order_vehicles"("vin");

-- CreateIndex
CREATE INDEX "order_vehicles_order_id_idx" ON "order_vehicles"("order_id");

-- AddForeignKey
ALTER TABLE "order_vehicles" ADD CONSTRAINT "order_vehicles_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Back-fill: one vehicle row per existing order that carried any vehicle
-- detail inline. gen_random_uuid() is available on Postgres 13+ (Supabase).
INSERT INTO "order_vehicles" ("id", "order_id", "position", "make", "model", "year", "colour", "vin", "engine_no")
SELECT gen_random_uuid(), "id", 1, "make", "model", "year", "colour", "vin", "engine_no"
FROM "orders"
WHERE "make" IS NOT NULL
   OR "model" IS NOT NULL
   OR "year" IS NOT NULL
   OR "colour" IS NOT NULL
   OR "vin" IS NOT NULL
   OR "engine_no" IS NOT NULL;

-- DropIndex
DROP INDEX "orders_vin_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "colour",
DROP COLUMN "engine_no",
DROP COLUMN "make",
DROP COLUMN "model",
DROP COLUMN "vin",
DROP COLUMN "year";
