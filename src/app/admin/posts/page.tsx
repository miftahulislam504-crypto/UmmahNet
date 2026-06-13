"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Loader2, Search, ExternalLink } from "lucide-react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs, startAfter, type QueryDocumentSnapshot } from "firebase/firestore";
import { db }              from "@/lib/firebase/config";
import { adminDeletePost } from "@/services/adminService";
import { Avatar }          from "@/components/ui/Avatar";
import { Button }          from "@/components/ui/Button";
import { formatDate }      from "@/lib/utils";
import type { Post }       from "@/types";
import toast               from "react-hot-toast";

type PostWithId = Post & { id: string };

export default function AdminPostsPage() {
  const [posts,      setPosts]      = useState<PostWithId[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lastDoc,    setLastDoc]    = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  async function fetchPosts(after?: QueryDocumentSnapshot) {
    const constraints: any[] = [orderBy("createdAt", "desc"), limit(20)];
    if (after) constraints.push(startAfter(after));

    const snap = await getDocs(query(collection(db, "posts"), ...constraints));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PostWithId));
    setLastDoc(snap.docs.at(-1) ?? null);
    return data;
  }

  useEffect(() => {
    fetchPosts().then((data) => { setPosts(data); setLoading(false); });
  }, []);

  async function loadMore() {
    if (!lastDoc) return;
    setLoadingMore(true);
    const data = await fetchPosts(lastDoc);
    setPosts((prev) => [...prev, ...data]);
    setLoadingMore(false);
  }

  async function handleDelete(postId: string) {
    setDeleting(postId);
    try {
      await adminDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post Moderation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and remove posts</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Author</th>
                  <th className="px-5 py-3 text-left">Content</th>
                  <th className="px-5 py-3 text-left">Likes</th>
                  <th className="px-5 py-3 text-left">Comments</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={post.authorPhoto} name={post.authorName} size="sm" />
                        <span className="font-medium text-gray-900 dark:text-white text-xs">{post.authorName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
                        {post.content || (post.mediaUrls?.length ? "📷 Photo" : "—")}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{post.likesCount}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{post.commentsCount}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {formatDate((post.createdAt as any)?.toDate?.() ?? new Date())}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/post/${post.id}`} target="_blank">
                          <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleting === post.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          {deleting === post.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastDoc && (
        <div className="flex justify-center">
          <Button variant="outline" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
