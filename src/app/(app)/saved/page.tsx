"use client";

import { useState, useEffect } from "react";
import { Bookmark, Loader2 }   from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db }          from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { PostCard }    from "@/components/feed/PostCard";
import type { Post }   from "@/types";

export default function SavedPage() {
  const { user }                  = useAuthStore();
  const [posts,   setPosts]       = useState<(Post & { id: string })[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q    = query(
        collection(db, "savedPosts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const postIds = snap.docs.map((d) => d.data().postId as string);

      const fetched = await Promise.all(
        postIds.map(async (id) => {
          const pSnap = await getDoc(doc(db, "posts", id));
          return pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } as Post & { id: string } : null;
        })
      );
      setPosts(fetched.filter(Boolean) as (Post & { id: string })[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary-600" />সেভ করা পোস্ট
        </h1>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">কোনো সেভ করা পোস্ট নেই</h3>
          <p className="text-sm text-gray-500">পোস্টের ⋯ মেনু থেকে সেভ করুন</p>
        </div>
      )}

      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
