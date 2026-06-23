"use client";
import React from "react";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter }        from "next/navigation";
import Image                           from "next/image";
import {
  Camera, Pencil, MessageCircle, Loader2,
  Grid3X3, Film, Sparkles, FileText,
} from "lucide-react";
import { doc, onSnapshot }        from "firebase/firestore";
import { db }                     from "@/lib/firebase/config";
import { useAuthStore }           from "@/store/authStore";
import { Avatar }                 from "@/components/ui/Avatar";
import { Button }                 from "@/components/ui/Button";
import { PostCard }               from "@/components/feed/PostCard";
import { PostSkeleton }           from "@/components/feed/PostSkeleton";
import { FriendButton }           from "@/components/friends/FriendButton";
import { useUserPosts }           from "@/hooks/usePosts";
import { useStartConversation }   from "@/hooks/useChat";
import { cn }                     from "@/lib/utils";
import type { UserProfile }       from "@/types";

type Tab = "posts" | "photos" | "videos" | "saved";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "posts",  label: "Posts",  icon: FileText },
  { id: "photos", label: "Photos", icon: Grid3X3  },
  { id: "videos", label: "Videos", icon: Film      },
  { id: "saved",  label: "Saved",  icon: Sparkles  },
];

function coverToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W  = 1200;
      const scale  = Math.min(1, MAX_W / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src     = url;
  });
}

export default function ProfilePage() {
  const { uid }               = useParams<{ uid: string }>();
  const { user: me }          = useAuthStore();
  const router                = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<Tab>("posts");
  const [coverLoading, setCoverLoading] = useState(false);
  const { start, loading: startingConv } = useStartConversation();
  const coverRef   = useRef<HTMLInputElement>(null);
  const isOwner    = me?.uid === uid;

  const { data, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserPosts(uid);
  const allPosts    = data?.pages.flatMap((p) => p.posts) ?? [];
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null); setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => { setProfile(snap.exists() ? (snap.data() as UserProfile) : null); setLoading(false); },
      (err)  => {
        setError(err.code === "permission-denied"
          ? "এই প্রোফাইল দেখার অনুমতি নেই"
          : "প্রোফাইল লোড করা যায়নি");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const el  = sentinelRef.current;
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
    } catch { alert("Cover update failed"); }
    finally   { setCoverLoading(false); e.target.value = ""; }
  }

  const photoPosts = allPosts.filter((p) => p.mediaUrls?.length > 0);
  const videoPosts = allPosts.filter((p) => p.type === "video");

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
    </div>
  );

  if (error) return (
    <div className="card p-12 text-center">
      <p className="font-medium text-red-400 mb-1">প্রোফাইল লোড হয়নি</p>
      <p className="text-sm text-gray-500">{error}</p>
    </div>
  );

  if (!profile) return (
    <div className="card p-12 text-center text-gray-500">User not found</div>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* ── Hero Card ── */}
      <div className="card overflow-hidden">

        {/* Cover */}
        <div className="relative h-44">
          {/* Gradient fallback */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #4c1d95 100%)" }}
          />
          {profile.coverPhoto && (
            <Image src={profile.coverPhoto} alt="Cover" fill className="object-cover" />
          )}
          {/* Gradient overlay at bottom for readability */}
          <div
            className="absolute inset-x-0 bottom-0 h-20"
            style={{ background: "linear-gradient(to top, rgba(15,13,26,0.7), transparent)" }}
          />
          {isOwner && (
            <>
              <button
                onClick={() => coverRef.current?.click()}
                disabled={coverLoading}
                className="absolute bottom-3 right-3 flex items-center gap-1.5
                           text-white text-xs px-3 py-1.5 rounded-xl transition-all active:scale-90"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                {coverLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Camera  className="w-3.5 h-3.5" />}
                কভার বদলান
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </>
          )}
        </div>

        {/* Avatar + Actions */}
        <div className="px-4 pt-0 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-3">
            {/* Avatar with ring */}
            <div className="relative">
              <div
                className="rounded-full p-1"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #9f67fa)",
                  boxShadow:  "0 0 20px rgba(124,58,237,0.4)",
                }}
              >
                <Avatar
                  src={profile.photoURL}
                  name={profile.displayName}
                  size="xl"
                  className="ring-2"
                  style={{ "--tw-ring-color": "rgba(15,13,26,0.9)" } as React.CSSProperties}
                />
              </div>
              {isOwner && (
                <button
                  onClick={() => router.push("/settings/edit-profile")}
                  className="absolute bottom-1 right-1 w-7 h-7 rounded-full
                             flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: "rgba(20,17,40,0.95)",
                    border:     "1.5px solid rgba(124,58,237,0.4)",
                  }}
                >
                  <Camera className="w-3.5 h-3.5 text-primary-400" />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-1">
              {isOwner ? (
                <Button variant="outline" size="sm" onClick={() => router.push("/settings/edit-profile")}>
                  <Pencil className="w-3.5 h-3.5" />
                  এডিট
                </Button>
              ) : (
                <>
                  <FriendButton theirUid={uid} size="sm" />
                  <Button variant="ghost" size="sm" loading={startingConv} onClick={handleMessage}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + bio */}
          <h1 className="text-xl font-bold text-gray-100 leading-tight">
            {profile.displayName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2.5 text-sm text-gray-300 leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex gap-5 mt-4">
            <StatItem value={profile.postsCount}  label="Posts"  />
            <StatItem value={profile.friendsCount} label="Friends" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all relative",
                tab === id ? "text-primary-300" : "text-gray-500 hover:text-gray-400"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={tab === id ? 2.2 : 1.8} />
              {label}
              {tab === id && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #9f67fa)" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab === "posts" && (
        <div className="flex flex-col gap-3">
          {postsLoading && <><PostSkeleton /><PostSkeleton /></>}
          {!postsLoading && allPosts.length === 0 && (
            <EmptyState icon={FileText} message={isOwner ? "এখনো কোনো পোস্ট নেই" : "কোনো পোস্ট নেই"} />
          )}
          {allPosts.map((post) => <PostCard key={post.id} post={post} />)}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          )}
        </div>
      )}

      {tab === "photos" && (
        <div className="card p-3">
          {postsLoading && <GridSkeleton cols={3} />}
          {!postsLoading && photoPosts.length === 0 && <EmptyState icon={Grid3X3} message="কোনো ছবি নেই" />}
          {!postsLoading && photoPosts.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {photoPosts.flatMap((p) =>
                (p.mediaUrls ?? []).map((url, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {tab === "videos" && (
        <div className="card p-3">
          {postsLoading && <GridSkeleton cols={2} />}
          {!postsLoading && videoPosts.length === 0 && <EmptyState icon={Film} message="কোনো ভিডিও নেই" />}
          {!postsLoading && videoPosts.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {videoPosts.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-video rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {p.mediaUrls?.[0] && <Image src={p.mediaUrls[0]} alt="" fill className="object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.3)" }}>
                    <Film className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "saved" && (
        <EmptyState icon={Sparkles} message="সেভ করা পোস্ট শুধু আপনি দেখতে পাবেন" />
      )}
    </div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-bold text-gray-100 text-base leading-tight">{value ?? 0}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(124,58,237,0.15)" }}
      >
        <Icon className="w-6 h-6 text-primary-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function GridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="skeleton aspect-square rounded-xl" />
      ))}
    </div>
  );
}
