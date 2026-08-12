import "server-only";
import sharp from "sharp";
import { randomBytes } from "node:crypto";

/**
 * Proof-of-payment image storage (Phase 7, replacing the earlier
 * has_proof_of_payment boolean stub). A private Supabase Storage bucket,
 * accessed via its plain REST API with the service-role key — not the full
 * @supabase/supabase-js SDK, since this is a handful of authenticated fetch
 * calls, not a reason to add a second client library alongside the existing
 * @prisma/adapter-pg + pg setup. The service-role key never reaches the
 * browser: every call here is server-only, and every caller (a Server
 * Action or a Route Handler) has already run its own session/ownership
 * check before this module is touched — access control is the app's job,
 * not the bucket's.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PROOF_BUCKET = "proof-of-payment";

// A phone camera photo can be several MB before processing; sharp
// normalizes it down to something small and consistent below, so this only
// needs to comfortably bound the *original* upload, not the stored result.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;

function requireConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — add both to .env (see backlog.md's Phase 7 notes).",
    );
  }
  return { url: SUPABASE_URL, key: SERVICE_ROLE_KEY };
}

export type UploadResult = { path: string } | { error: string };

// Validated by content, not by trusting the extension or the browser's
// reported MIME type: sharp actually decodes the bytes, and a file that
// isn't a real image throws rather than silently passing through. Metadata
// (EXIF — which can include GPS coordinates) is stripped as a side effect
// of never calling .withMetadata(); .rotate() bakes in the EXIF orientation
// *before* that metadata is dropped, so a portrait phone photo doesn't end
// up sideways once the tag that says which way is up is gone.
export async function uploadProofImage(file: File, pathPrefix: string): Promise<UploadResult> {
  if (file.size === 0) return { error: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "That image is too large (8MB max)." };

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let processed: Buffer;
  try {
    processed = await sharp(inputBuffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch {
    return { error: "That doesn't look like a valid image file." };
  }

  const { url, key } = requireConfig();
  const path = `${pathPrefix}/${Date.now()}-${randomBytes(6).toString("hex")}.jpg`;

  const res = await fetch(`${url}/storage/v1/object/${PROOF_BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "image/jpeg" },
    // Uint8Array, not the raw Buffer — @types/node's Buffer isn't
    // structurally assignable to the DOM lib's BodyInit here (same fix as
    // Phase 6's PDF/Excel export routes).
    body: new Uint8Array(processed),
  });
  if (!res.ok) {
    console.error("[uploadProofImage] Supabase Storage upload failed", res.status, await res.text().catch(() => ""));
    return { error: "Could not upload the image. Please try again." };
  }

  return { path };
}

export type FetchedImage = { buffer: Buffer; contentType: string };

// No caller passes an untrusted path directly to this — see each Route
// Handler's own DB lookup, which resolves the path from the record itself
// rather than accepting one from the request.
export async function fetchProofImage(path: string): Promise<FetchedImage | null> {
  const { url, key } = requireConfig();
  const res = await fetch(`${url}/storage/v1/object/${PROOF_BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: res.headers.get("content-type") ?? "image/jpeg" };
}
