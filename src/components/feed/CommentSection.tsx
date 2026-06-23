"use client";

import { useState }  from "react";
import Link          from "next/link";
import { Send, Trash2, CheckCircle2, MessageCircle } from "lucide-react";
import { Avatar }       from "@/components/ui/Avatar";
import { useComments }  from "@/hooks/usePosts";
import { useAuthStore } from "@/store/authStore";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  postId:     string;
  isQuestion?: boolean;  // Phase 12: show "accept answer" for question posts
  isOwner?:   boolean;   // Phase 12: post owner can mark accepted answer
}

export function CommentSection({ postId, isQuestion = false, isOwner = false }: Props) {
  const { user, profile }                              = useAuthStore();
  const { comments, submit, remove, acceptAnswer, submitting } = useComments(postId);
  const [text, setText]                               = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await submit(text);
    setText("");
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">

      {/* Input */}
      {profile && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
          <div
            className="flex-1 flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{
              background:     "rgba(255,255,255,0.06)",
              border:         "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isQuestion ? "উত্তর লিখুন…" : "Reflection লিখুন…"}
              className="flex-1 bg-transparent text-sm outline-none text-gray-200 placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="text-primary-400 disabled:opacity-30 transition-all active:scale-90"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {comments.map((comment) => {
          const isMine    = user?.uid === comment.authorId;
          const createdAt = (comment.createdAt as any)?.toDate?.() ?? new Date();
          const accepted  = comment.isAcceptedAnswer;

          return (
            <div
              key={comment.id}
              className={cn(
                "flex items-start gap-2.5 group rounded-2xl p-2 -mx-2 transition-colors",
                accepted && "ring-1"
              )}
              style={
                accepted
                  ? { background: "rgba(52,211,153,0.06)", ringColor: "rgba(52,211,153,0.3)" }
                  : undefined
              }
            >
              <Link href={`/profile/${comment.authorId}`} className="flex-shrink-0">
                <Avatar src={comment.authorPhoto} name={comment.authorName} size="sm" />
              </Link>

              <div className="flex-1 min-w-0">
                {/* Bubble */}
                <div
                  className="inline-block max-w-full px-3 py-2 rounded-2xl"
                  style={{
                    background:     "rgba(255,255,255,0.06)",
                    border:         "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Link href={`/profile/${comment.authorId}`}>
                      <p className="text-[12px] font-semibold text-gray-300 hover:text-primary-300 transition-colors">
                        {comment.authorName}
                      </p>
                    </Link>
                    {accepted && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        সেরা উত্তর
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-200 leading-relaxed break-words">
                    {comment.content}
                  </p>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1 px-1">
                  <p className="text-[11px] text-gray-600">{formatDate(createdAt)}</p>

                  {/* Accept answer — only post owner, only question posts */}
                  {isQuestion && isOwner && !accepted && (
                    <button
                      onClick={() => acceptAnswer(comment.id)}
                      className="text-[11px] text-emerald-500 hover:text-emerald-400
                                 font-medium transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      সেরা উত্তর
                    </button>
                  )}
                </div>
              </div>

              {/* Delete */}
              {isMine && (
                <button
                  onClick={() => remove(comment.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                             text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-4">
            <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-1.5" />
            <p className="text-xs text-gray-600">
              {isQuestion ? "এখনো কোনো উত্তর নেই" : "প্রথম Reflection লিখুন"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
