"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Camera, Pencil, MessageCircle, Calendar, Loader2 } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore }     from "@/store/authStore";
import { Avatar }           from "@/components/ui/Avatar";
import { Button }           from "@/components/ui/Button";
import { PostCard }         from "@/components/feed/PostCard";
import { PostSkeleton }     from "@/components/feed/PostSkeleton";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FriendButton }     from "@/components/friends/FriendButton";
import { useUserPosts }     from "@/hooks/usePosts";
import { useStartConversation } from "@/hooks/useChat";
import { formatDate }       from "@/lib/utils";
import type { UserProfile } from "@/types";
import { useRouter }        from "next/navigation";

export default function ProfilePage() {
  const { uid }               = useParams<{ uid: string }>();
  const { user: me }          = useAuthStore();
  const router                = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { start, loading: startingConv } = useStartConversation();

  const isOwner = me?.uid === uid;

  const {
    data, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useUserPosts(uid);

  const allPosts   = data?.pages.flatMap((p) => p.posts) ?? [];
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
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
    const convId = await start(profile.uid);
    if (convId) router.push(`/messages?with=${profile.uid}`);
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="card p-12 text-center text-gray-500">ব্যবহারকারী পাওয়া যায়নি</div>
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Profile card */}
        <div className="card overflow-hidden">
          {/* Cover */}
          <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-700">
            {profile.coverPhoto && (
              <Image src={profile.coverPhoto} alt="cover" fill className="object-cover" />
            )}
            {isOwner && (
              <button className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50
                                 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/70 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                কভার পরিবর্তন
              </button>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <Avatar
                  src={profile.photoURL}
                  name={profile.displayName}
                  size="xl"
                  className="ring-4 ring-white dark:ring-gray-900"
                />
                {isOwner && (
                  <button className="absolute bottom-1 right-1 w-7 h-7 bg-gray-100 dark:bg-gray-800
                                     rounded-full flex items-center justify-center shadow
                                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 mt-14">
                {isOwner ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="w-4 h-4" />প্রোফাইল সম্পাদনা
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
                      <MessageCircle className="w-4 h-4" />মেসেজ
                    </Button>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.displayName}</h1>
            <p className="text-gray-500 text-sm">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
            )}

            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">{profile.postsCount}</p>
                <p className="text-xs text-gray-500">পোস্ট</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">{profile.friendsCount}</p>
                <p className="text-xs text-gray-500">বন্ধু</p>
              </div>
            </div>

            {profile.createdAt && (
              <div className="flex items-center gap-1.5 mt-4 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {formatDate((profile.createdAt as any).toDate?.() ?? new Date())} যোগ দিয়েছেন
              </div>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="flex flex-col gap-4">
          {postsLoading && <><PostSkeleton /><PostSkeleton /></>}
          {allPosts.map((post) => <PostCard key={post.id} post={post} />)}
          {!postsLoading && allPosts.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-500 text-sm">এখনো কোনো পোস্ট নেই</p>
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditProfileModal profile={profile} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
