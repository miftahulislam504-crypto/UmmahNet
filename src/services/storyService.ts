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

// ─── File → Base64 ────────────────────────────────────────────────────────────
async function mediaToBase64(file: File): Promise<string> {
  // Video: store as-is via FileReader (base64)
  if (file.type.startsWith("video/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // Image: resize to max 1080px
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1080;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Create story ─────────────────────────────────────────────────────────────
export async function createStory(
  authorId:    string,
  authorName:  string,
  authorPhoto: string,
  file:        File,
  caption:     string
): Promise<void> {
  const isVideo  = file.type.startsWith("video/");
  const mediaUrl = await mediaToBase64(file);

  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await addDoc(collection(db, "stories"), {
    authorId,
    authorName,
    authorPhoto,
    mediaUrl,
    type:      isVideo ? "video" : "image",
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
  callback: (groups: StoryGroup[]) => void
): Unsubscribe {
  const now = Timestamp.now();
  const q   = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc")
  );

  return onSnapshot(q, (snap) => {
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
  });
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
