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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";

export interface Story {
  id:        string;
  authorId:  string;
  authorName:  string;
  authorPhoto: string;
  mediaUrl:  string;
  type:      "image" | "video";
  caption:   string;
  viewerIds: string[];
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export interface StoryGroup {
  authorId:    string;
  authorName:  string;
  authorPhoto: string;
  stories:     Story[];
  hasUnviewed: boolean;
}

// ─── Create story ─────────────────────────────────────────────────────────────
export async function createStory(
  authorId:    string,
  authorName:  string,
  authorPhoto: string,
  file:        File,
  caption:     string
): Promise<void> {
  const isVideo = file.type.startsWith("video/");
  const ext     = file.name.split(".").pop();
  const path    = `stories/${authorId}/${Date.now()}.${ext}`;
  const storRef = ref(storage, path);

  await uploadBytes(storRef, file);
  const mediaUrl = await getDownloadURL(storRef);

  // expires in 24 hours
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

// ─── Subscribe to active stories (not expired) ───────────────────────────────
export function subscribeToStories(
  callback: (groups: StoryGroup[]) => void
): Unsubscribe {
  const now = Timestamp.now();
  const q   = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    const stories = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Story));

    // Group by authorId
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
    orderBy("expiresAt", "asc"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Story));
}
