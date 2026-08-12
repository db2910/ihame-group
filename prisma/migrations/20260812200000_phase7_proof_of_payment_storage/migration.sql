-- Phase 7: replaces the has_proof_of_payment boolean stub (Phase 3/4) with a
-- real file reference — the storage path of the image in a private Supabase
-- Storage bucket, or NULL if none was attached. "Proof attached" is now
-- "this column is not null", enforced in the Server Actions same as before.
--
-- The existing boolean values were never backed by a real file (proof
-- upload didn't exist until now), so there is nothing to back-fill into the
-- new path column — every row starts NULL regardless of its old flag value,
-- which is the honest state (no image was ever actually stored for them).

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "proof_of_payment_path" TEXT;
ALTER TABLE "sales" DROP COLUMN "has_proof_of_payment";

-- AlterTable
ALTER TABLE "order_payments" ADD COLUMN "proof_of_payment_path" TEXT;
ALTER TABLE "order_payments" DROP COLUMN "has_proof_of_payment";
