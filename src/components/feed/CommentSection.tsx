"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Avatar }       from "@/components/ui/Avatar";
import { useComments }  from "@/hooks/usePosts";
import { useAuthStore } from "@/store/authStore";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";

interface Props { postId: string }

export function CommentSection({ postId }: Props) {
  const { user, profile }               = useAuthStore();
  const { comments, submit, remove, submitting } = useComments(postId);
  const [text, setText]                 = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await submit(text);
    setText("");
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      {/* Comment input */}
      {profile && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="মন্তব্য করুন..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="text-primary-600 disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="flex flex-col gap-2">
        {comments.map((comment) => {
          const isOwner   = user?.uid === comment.authorId;
          const createdAt = (comment.createdAt as any)?.toDate?.() ?? new Date();
          return (
            <div key={comment.id} className="flex items-start gap-2 group">
              <Link href={`/profile/${comment.authorId}`} className="flex-shrink-0">
                <Avatar src={comment.authorPhoto} name={comment.authorName} size="sm" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 inline-block max-w-full">
                  <Link href={`/profile/${comment.authorId}`}>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white hover:underline">
                      {comment.authorName}
                    </p>
                  </Link>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {comment.content}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 px-1">
                  {formatDate(createdAt)}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => remove(comment.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400
                             hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                             transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            প্রথম মন্তব্য করুন
          </p>
        )}
      </div>
    </div>
  );
}
