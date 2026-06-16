import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

// ─── PHASE 7: Storage helpers ──────────────────────────────────────────────────
// Goal: stop inlining images as Base64 inside Firestore documents (posts,
// stories, covers, avatars, chat messages). Each Base64 image can be
// hundreds of KB to a few MB — with enough posts/stories that blows past
// Firestore's 1MB-per-document limit and bloats every read.
//
// Instead: compress on-device, upload the compressed Blob to Firebase
// Storage (rules already exist in storage.rules for avatars/, covers/,
// posts/images/, stories/{uid}/, chat/images/{convId}/), and store only the
// small `https://...` download URL string in Firestore.

export interface CompressOptions {
  maxDimension: number; // longest side, px
  quality:      number; // 0..1 JPEG quality
}

export const COMPRESS_PRESETS = {
  post:   { maxDimension: 1080, quality: 0.85 } as CompressOptions,
  story:  { maxDimension: 1080, quality: 0.85 } as CompressOptions,
  cover:  { maxDimension: 1200, quality: 0.85 } as CompressOptions,
  avatar: { maxDimension: 500,  quality: 0.85 } as CompressOptions,
  chat:   { maxDimension: 1080, quality: 0.85 } as CompressOptions,
};

// ─── Resize + re-encode an image File as a JPEG Blob (runs in-browser) ────────
export function compressImage(
  file: File,
  opts: CompressOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale  = Math.min(1, opts.maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.max(1, Math.round(img.width  * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob() returned null"))),
        "image/jpeg",
        opts.quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ─── Upload any Blob/File to a Storage path, return its public download URL ──
export async function uploadAndGetURL(
  path:        string,
  data:        Blob | File,
  contentType?: string
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, data, contentType ? { contentType } : undefined);
  return getDownloadURL(storageRef);
}

// ─── Convenience: compress an image File then upload it ──────────────────────
export async function uploadCompressedImage(
  path: string,
  file: File,
  opts: CompressOptions
): Promise<string> {
  const blob = await compressImage(file, opts);
  return uploadAndGetURL(path, blob, "image/jpeg");
}

// ─── Best-effort delete (e.g. when replacing an avatar/cover) ────────────────
// Ignores "object not found" — never blocks the calling flow on cleanup.
export async function deleteStorageFile(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (err: any) {
    if (err?.code !== "storage/object-not-found") {
      console.error("deleteStorageFile failed:", path, err);
    }
  }
}

// ─── Random suffix for unique filenames (post images, chat images, etc.) ─────
export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
