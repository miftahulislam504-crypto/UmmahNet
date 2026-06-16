"use client";

import { useState, useEffect, useRef } from "react";
import Link   from "next/link";
import Image  from "next/image";
import {
  Heart, MessageCircle, Send, Bookmark,
  MoreHorizontal, Trash2, Globe, Users, Lock, Flag,
  ChevronLeft, ChevronRight, UserX, UserCheck,
} from "lucide-react";
import { Avatar }         from "@/components/ui/Avatar";
import { ReportModal }    from "@/components/ui/ReportModal";
import { CommentSection } from "@/components/feed/CommentSection";
import { useLike, useDeletePost } from "@/hooks/usePosts";
import { useHiddenUsers, useToggleBlock } from "@/hooks/useBlocks";
import { useAuthStore }   from "@/store/authStore";
import { toggleSavePost, isPostSaved, renderWithHashtags } from "@/services/advancedService";
import { formatDate, cn } from "@/lib/utils";
import type { Post }      from "@/types";
import toast              from "react-hot-toast";
import { useRouter }      from "next/navigation";

const visibilityIcon = { public: Globe, friends: Users, private: Lock };

interface Props { post: Post & { id: string } }

export function PostCard({ post }: Props) {
  const { user, profile }        = useAuthStore();
  const router                   = useRouter();
  const { liked, count, toggle } = useLike(post.id, post.likesCount);
  const deletePost               = useDeletePost();
  const { blockedByMe }          = useHiddenUsers();
  const toggleBlock              = useToggleBlock(post.authorId);
  const isBlockedByMe            = blockedByMe.has(post.authorId);

  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [imgIndex,     setImgIndex]     = useState(0);
  const [heartAnim,    setHeartAnim]    = useState(false);

  const isOwner  = user?.uid === post.authorId;
  const VisIcon  = visibilityIcon[post.visibility];
  // Use live profile photo for own posts (fixes stale authorPhoto after upload)
  const displayPhoto = isOwner && profile?.photoURL ? profile.photoURL : post.authorPhoto;
  const longText = post.content.length > 280;
  const imgs     = post.mediaUrls ?? [];

  useEffect(() => {
    if (!user) return;
    isPostSaved(user.uid, post.id).then(setSaved);
  }, [post.id, user]);

  async function handleSave() {
    if (!user) return;
    const nowSaved = await toggleSavePost(user.uid, post.id);
    setSaved(nowSaved);
    toast.success(nowSaved ? "Saved" : "Removed from saved");
  }

  async function handleShare() {
    try {
      await navigator.share({ title: post.authorName, text: post.content });
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success("Link copied");
    }
  }

  // Double-tap to like
  const lastTap = useRef(0);
  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) toggle();
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 900);
    }
    lastTap.current = now;
  }

  const createdDate = (post.createdAt as any)?.toDate?.() ?? new Date();
  const contentParts = renderWithHashtags(
    longText && !expanded ? post.content.slice(0, 280) + "…" : post.content
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Link href={`/profile/${post.authorId}`}>
              <Avatar src={displayPhoto} name={post.authorName} size="md" />
            </Link>
            <div>
              <Link href={`/profile/${post.authorId}`}>
                <p className="font-semibold text-[13px] text-gray-900 dark:text-white leading-tight">
                  {post.authorName}
                </p>
              </Link>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <VisIcon className="w-3 h-3" />
                <span>{formatDate(createdDate)}</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-9 bg-white dark:bg-gray-900
                                border border-gray-100 dark:border-gray-800
                                rounded-2xl shadow-xl w-48 overflow-hidden z-20">
                  <button
                    onClick={() => { handleSave(); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm
                               text-gray-700 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Bookmark className={cn("w-4 h-4", saved && "fill-current text-primary-600")} />
                    {saved ? "সেভ থেকে সরান" : "পোস্ট সেভ করুন"}
                  </button>
                  {!isOwner && (
                    <button
                      onClick={() => { setShowReport(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Flag className="w-4 h-4" /> Report
                    </button>
                  )}
                  {/* PHASE 6: Block/Unblock the post's author. Blocking also
                      removes any friendship + pending requests and hides
                      their posts from your feed/search (and vice-versa). */}
                  {!isOwner && (
                    <button
                      onClick={() => { toggleBlock.mutate(); setShowMenu(false); }}
                      disabled={toggleBlock.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {isBlockedByMe
                        ? <UserCheck className="w-4 h-4" />
                        : <UserX className="w-4 h-4" />}
                      {isBlockedByMe ? "আনব্লক" : "ব্লক"} {post.authorName.split(" ")[0]}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowMenu(false); deletePost.mutate(post.id); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Caption (above image like FB, below header) ── */}
        {post.content && (
          <div className="px-3 pb-2">
            <p className="text-[14px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              <span className="font-semibold mr-1.5">{post.authorName.split(" ")[0]}</span>
              {contentParts.map((part, i) =>
                part.type === "hashtag" ? (
                  <button
                    key={i}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(part.value)}`)}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    {part.value}
                  </button>
                ) : (
                  <span key={i}>{part.value}</span>
                )
              )}
            </p>
            {longText && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 text-[13px] mt-0.5"
              >
                {expanded ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        {/* ── Media carousel ── */}
        {imgs.length > 0 && (
          <div
            className="relative bg-black select-none"
            style={{ aspectRatio: imgs.length === 1 ? "4/5" : "1/1" }}
            onClick={handleDoubleTap}
          >
            <Image
              src={imgs[imgIndex]}
              alt=""
              fill
              className="object-contain"
              unoptimized
            />

            {/* Double-tap heart burst */}
            {heartAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-24 h-24 text-white fill-white opacity-90
                                  animate-ping" style={{ animationDuration: "0.6s" }} />
              </div>
            )}

            {/* Prev / Next arrows */}
            {imgs.length > 1 && (
              <>
                {imgIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setImgIndex(i => i - 1); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2
                               w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
                {imgIndex < imgs.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setImgIndex(i => i + 1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2
                               w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {imgs.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-200",
                        i === imgIndex
                          ? "w-2 h-2 bg-white"
                          : "w-1.5 h-1.5 bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Action row — Instagram style ── */}
        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Like */}
            <button
              onClick={toggle}
              className="transition-transform active:scale-75"
            >
              <Heart
                className={cn(
                  "w-6 h-6 transition-colors",
                  liked ? "fill-red-500 text-red-500" : "text-gray-800 dark:text-gray-200"
                )}
              />
            </button>
            {/* Comment */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="transition-transform active:scale-75"
            >
              <MessageCircle className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
            {/* Share */}
            <button
              onClick={handleShare}
              className="transition-transform active:scale-75"
            >
              <Send className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
          {/* Bookmark — right side */}
          <button onClick={handleSave} className="transition-transform active:scale-75">
            <Bookmark
              className={cn(
                "w-6 h-6 transition-colors",
                saved ? "fill-gray-900 dark:fill-white text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200"
              )}
            />
          </button>
        </div>

        {/* ── Like count ── */}
        {count > 0 && (
          <div className="px-3 pb-1">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
              {count.toLocaleString()} {count === 1 ? "like" : "likes"}
            </p>
          </div>
        )}

        {/* ── Timestamp ── */}
        <div className="px-3 pb-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">
            {formatDate(createdDate)}
          </p>
        </div>

        {/* ── Comments inline ── */}
        {post.commentsCount > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="px-3 pb-2 text-[13px] text-gray-400"
          >
            View all {post.commentsCount} comment{post.commentsCount !== 1 ? "s" : ""}
          </button>
        )}

        {showComments && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            <CommentSection postId={post.id} />
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal targetId={post.id} targetType="post" onClose={() => setShowReport(false)} />
      )}
    </>
  );
}
