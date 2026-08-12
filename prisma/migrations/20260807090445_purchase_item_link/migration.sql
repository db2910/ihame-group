-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "purchase_item_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_purchase_item_id_key" ON "stock_movements"("purchase_item_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

