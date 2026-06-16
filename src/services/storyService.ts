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
import { uploadCompressedImage, uploadAndGetURL, COMPRESS_PRESETS, randomId } from "@/lib/firebase/storage";

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

// ─── Create story ─────────────────────────────────────────────────────────────
// PHASE 7 FIX: previously images were converted to Base64 and stored inline
// in the Firestore story document. A single photo easily hit 300–600 KB
// inside the document, and video was outright blocked because it would
// always exceed Firestore's 1MB-per-document limit.
// Now we upload to Firebase Storage (stories/{authorId}/{id}.jpg or .mp4)
// and store only the small download URL in Firestore — video is now fully
// supported too.
export async function createStory(
  authorId:    string,
  authorName:  string,
  authorPhoto: string | null | undefined,
  file:        File,
  caption:     string
): Promise<void> {
  const id        = randomId();
  const isVideo   = file.type.startsWith("video/");
  const ext       = isVideo ? "mp4" : "jpg";
  const path      = `stories/${authorId}/${id}.${ext}`;

  let mediaUrl: string;
  if (isVideo) {
    // Videos go straight to Storage — no client-side compression.
    mediaUrl = await uploadAndGetURL(path, file, file.type);
  } else {
    mediaUrl = await uploadCompressedImage(path, file, COMPRESS_PRESETS.story);
  }

  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await addDoc(collection(db, "stories"), {
    authorId,
    authorName,
    authorPhoto: authorPhoto ?? "",
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
  myUid: string,
  friendUids: string[],
  callback: (groups: StoryGroup[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const now = Timestamp.now();

  // PHASE 12 FIX: previously no audience filter at all — every signed-in
  // user's stories were fetched (issue #1). Firestore `in` supports at most
  // 30 values, so cap to self + first 29 friends for now.
  let authorIds = [myUid, ...friendUids];
  if (authorIds.length > 30) {
    console.warn(
      `subscribeToStories: ${friendUids.length} friends exceeds the 30-value ` +
      `"in" limit — showing stories from the first 29 friends only.`
    );
    authorIds = authorIds.slice(0, 30);
  }

  const q = query(
    collection(db, "stories"),
    where("authorId", "in", authorIds),
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
