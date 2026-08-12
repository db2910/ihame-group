-- Phase 7 (PWA offline queue): idempotency key for sale completion. A UUID
-- the POS generates client-side the moment "Complete sale" is tapped, before
-- it's known whether the request will reach the server. A retried submission
-- of the same sale (offline-queue flush retrying after a lost response, or
-- experimental.useOffline replaying a Server Action once the network
-- returns) hits this unique constraint instead of creating a second sale.
-- Nullable and unique: Postgres allows any number of NULLs in a unique
-- index, which is exactly right here — only actual values need to collide.

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "client_request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_client_request_id_key" ON "sales"("client_request_id");
