"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Pencil, MessageCircle, Loader2, Grid3X3, Film, Heart, FileText } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db }              from "@/lib/firebase/config";
import { useAuthStore }    from "@/store/authStore";
import { Avatar }          from "@/components/ui/Avatar";
import { Button }          from "@/components/ui/Button";
import { PostCard }        from "@/components/feed/PostCard";
import { PostSkeleton }    from "@/components/feed/PostSkeleton";
import { FriendButton }    from "@/components/friends/FriendButton";
import { useUserPosts }    from "@/hooks/usePosts";
import { useStartConversation } from "@/hooks/useChat";
import { cn }              from "@/lib/utils";
import type { UserProfile } from "@/types";

type ProfileTab = "posts" | "photos" | "videos" | "liked";

const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: "posts",  label: "Posts",  icon: FileText  },
  { id: "photos", label: "Photos", icon: Grid3X3   },
  { id: "videos", label: "Videos", icon: Film       },
  { id: "liked",  label: "Liked",  icon: Heart      },
];

// Cover image → Base64 (max 1200px wide)
function coverToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W = 1200;
      const scale = Math.min(1, MAX_W / img.width);
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

export default function ProfilePage() {
  const { uid }               = useParams<{ uid: string }>();
  const { user: me }          = useAuthStore();
  const router                = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab, setTab]         = useState<ProfileTab>("posts");
  const [coverLoading, setCoverLoading] = useState(false);
  const { start, loading: startingConv } = useStartConversation();

  const coverRef = useRef<HTMLInputElement>(null);
  const isOwner  = me?.uid === uid;

  const {
    data, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useUserPosts(uid);

  const allPosts    = data?.pages.flatMap((p) => p.posts) ?? [];
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      },
      // BUG FIX: previously no error handler — a permission-denied (e.g.
      // stale Firestore rules) or network error left `loading` true
      // forever, so clicking on another user's profile just spun forever
      // with no profile and no message ("profile click does nothing").
      (err) => {
        console.error("Profile load error:", err);
        setError(
          err.code === "permission-denied"
            ? "এই প্রোফাইল দেখার অনুমতি নেই — Firestore rules আপডেট/পাবলিশ করা হয়েছে কিনা চেক করুন"
            : "প্রোফাইল লোড করা যায়নি, আবার চেষ্টা করুন"
        );
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function handleMessage() {
    if (!profile) return;
    await start(profile.uid);
    router.push(`/messages?with=${profile.uid}`);
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setCoverLoading(true);
    try {
      const base64 = await coverToBase64(file);
      const { doc: docFn, updateDoc } = await import("firebase/firestore");
      await updateDoc(docFn(db, "users", me.uid), { coverPhoto: base64 });
    } catch {
      alert("Cover update failed");
    } finally {
      setCoverLoading(false);
      e.target.value = "";
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  if (error) return (
    <div className="card p-12 text-center">
      <p className="font-medium text-red-500 mb-1">প্রোফাইল লোড হয়নি</p>
      <p className="text-sm text-gray-500">{error}</p>
    </div>
  );

  if (!profile) return (
    <div className="card p-12 text-center text-gray-500">User not found</div>
  );

  const photoPosts = allPosts.filter((p) => p.mediaUrls?.length > 0);
  const videoPosts = allPosts.filter((p) => p.type === "video");

  return (
    <>
      <div className="flex flex-col">

        {/* ── Cover + Avatar ── */}
        <div className="card overflow-hidden mb-0 rounded-b-none border-b-0">
          {/* Cover photo */}
          <div className="relative h-44 bg-gradient-to-br from-primary-400 to-primary-700">
            {profile.coverPhoto && (
              <Image src={profile.coverPhoto} alt="Cover" fill className="object-cover" />
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => coverRef.current?.click()}
                  disabled={coverLoading}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5
                             bg-black/50 hover:bg-black/70 text-white text-xs
                             px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {coverLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Camera className="w-3.5 h-3.5" />
                  }
                  Edit cover
                </button>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </>
            )}
          </div>

          {/* Avatar row */}
          <div className="px-4 pb-4">
            <div className="flex items-end justify-between -mt-10 mb-3">
              <div className="relative">
                <Avatar
                  src={profile.photoURL}
                  name={profile.displayName}
                  size="xl"
                  className="ring-4 ring-white dark:ring-gray-900"
                />
                {isOwner && (
                  <button
                    onClick={() => router.push("/settings/edit-profile")}
                    className="absolute bottom-0.5 right-0.5 w-7 h-7
                               bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
                               dark:hover:bg-gray-600 rounded-full
                               flex items-center justify-center shadow transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pb-1">
                {isOwner ? (
                  <Button variant="outline" size="sm" onClick={() => router.push("/settings/edit-profile")}>
                    <Pencil className="w-3.5 h-3.5" />
                    Edit profile
                  </Button>
                ) : (
                  <>
                    <FriendButton theirUid={uid} size="sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      loading={startingConv}
                      onClick={handleMessage}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {profile.displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="flex gap-6 mt-4">
              <StatItem value={profile.postsCount}  label="Posts"   />
              <StatItem value={profile.friendsCount} label="Friends" />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3",
                  "text-xs font-medium transition-colors relative",
                  tab === id
                    ? "text-primary-600"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {tab === id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="card rounded-t-none border-t-0 min-h-40 p-4">
          {tab === "posts" && (
            <div className="flex flex-col gap-4">
              {postsLoading && <><PostSkeleton /><PostSkeleton /></>}
              {!postsLoading && allPosts.length === 0 && (
                <EmptyState icon={FileText} message={isOwner ? "You haven't posted anything yet." : "No posts yet."} />
              )}
              {allPosts.map((post) => <PostCard key={post.id} post={post} />)}
              <div ref={sentinelRef} className="h-4" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                </div>
              )}
            </div>
          )}

          {tab === "photos" && (
            <>
              {postsLoading && <GridSkeleton />}
              {!postsLoading && photoPosts.length === 0 && <EmptyState icon={Grid3X3} message="No photos yet." />}
              {!postsLoading && photoPosts.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
                  {photoPosts.flatMap((p) =>
                    (p.mediaUrls ?? []).map((url, i) => (
                      <div key={`${p.id}-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <Image src={url} alt="" fill className="object-cover" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {tab === "videos" && (
            <>
              {postsLoading && <GridSkeleton cols={2} />}
              {!postsLoading && videoPosts.length === 0 && <EmptyState icon={Film} message="No videos yet." />}
              {!postsLoading && videoPosts.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {videoPosts.map((p) => (
                    <div key={p.id} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {p.mediaUrls?.[0] && <Image src={p.mediaUrls[0]} alt="" fill className="object-cover" />}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "liked" && <EmptyState icon={Heart} message="Liked posts are private." />}
        </div>
      </div>

    </>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function GridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-1 animate-pulse`}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}
