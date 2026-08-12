-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "goods_category" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "origin_port" DROP NOT NULL,
ALTER COLUMN "destination" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "total_amount" DROP NOT NULL;
