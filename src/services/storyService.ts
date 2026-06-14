import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface Story {
  id:          string;
  authorId:    string;
  authorName:  string;
  authorPhoto: string;
  mediaUrl:    string;
  type:        "image" | "video";
  caption:     string;
  viewerIds:   string[];
  expiresAt:   Timestamp;
  createdAt:   Timestamp;
}

export interface StoryGroup {
  authorId:    string;
  authorName:  string;
  authorPhoto: string;
  stories:     Story[];
  hasUnviewed: boolean;
}

// ─── Image → Base64 (max 900px, quality 0.82) ───────────────────────────────
// NOTE: Video is NOT supported — Firestore has a 1MB document limit.
// Storing video as base64 always exceeds that limit and causes story upload to fail.
// Only images are accepted; the UI hides the video option accordingly.
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Create story ─────────────────────────────────────────────────────────────
export async function createStory(
  authorId:    string,
  authorName:  string,
  authorPhoto: string | null | undefined,
  file:        File,
  caption:     string
): Promise<void> {
  if (file.type.startsWith("video/")) {
    throw new Error("Video stories are not supported yet. Please upload an image.");
  }
  const mediaUrl = await imageToBase64(file);

  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await addDoc(collection(db, "stories"), {
    authorId,
    authorName,
    authorPhoto:   authorPhoto ?? "",
    mediaUrl,
    type:      "image",
    caption:   caption.trim(),
    viewerIds: [],
    expiresAt,
    createdAt: serverTimestamp(),
  });
}

// ─── Mark story as viewed ─────────────────────────────────────────────────────
export async function viewStory(storyId: string, viewerId: string): Promise<void> {
  await updateDoc(doc(db, "stories", storyId), {
    viewerIds: arrayUnion(viewerId),
  });
}

// ─── Subscribe to active stories ─────────────────────────────────────────────
// FIX: removed compound orderBy (expiresAt + createdAt) which needed a
// composite index. Now only orderBy expiresAt, sort createdAt client-side.
export function subscribeToStories(
  callback: (groups: StoryGroup[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const now = Timestamp.now();
  const q   = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const stories = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Story))
        .sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());

      const map = new Map<string, StoryGroup>();
      for (const story of stories) {
        if (!map.has(story.authorId)) {
          map.set(story.authorId, {
            authorId:    story.authorId,
            authorName:  story.authorName,
            authorPhoto: story.authorPhoto,
            stories:     [],
            hasUnviewed: false,
          });
        }
        map.get(story.authorId)!.stories.push(story);
      }

      callback(Array.from(map.values()));
    },
    // BUG FIX: previously no error callback — a permission-denied or
    // network error left the listener silently dead, so `loading` in
    // useStories() stayed true forever and StoryBar showed endless
    // skeleton placeholders with no feedback.
    (err) => {
      console.error("subscribeToStories error:", err);
      onError?.(err as unknown as Error);
    }
  );
}

// ─── Get stories by user ──────────────────────────────────────────────────────
export async function getUserStories(authorId: string): Promise<Story[]> {
  const now = Timestamp.now();
  const q   = query(
    collection(db, "stories"),
    where("authorId",  "==", authorId),
    where("expiresAt", ">",  now),
    orderBy("expiresAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Story))
    .sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
}
