"use client";

import { useState, useEffect } from "react";
import Link   from "next/link";
import Image  from "next/image";
import {
  Heart, MessageCircle, Share2, MoreHorizontal,
  Trash2, Globe, Users, Lock, Bookmark, Flag,
} from "lucide-react";
import { Avatar }         from "@/components/ui/Avatar";
import { ReportModal }    from "@/components/ui/ReportModal";
import { CommentSection } from "@/components/feed/CommentSection";
import { useLike, useDeletePost } from "@/hooks/usePosts";
import { useAuthStore }   from "@/store/authStore";
import { toggleSavePost, isPostSaved, renderWithHashtags } from "@/services/advancedService";
import { formatDate, cn } from "@/lib/utils";
import type { Post }      from "@/types";
import toast              from "react-hot-toast";
import { useRouter }      from "next/navigation";

const visibilityIcon = { public: Globe, friends: Users, private: Lock };

interface Props { post: Post & { id: string } }

export function PostCard({ post }: Props) {
  const { user }                = useAuthStore();
  const router                  = useRouter();
  const { liked, count, toggle } = useLike(post.id, post.likesCount);
  const deletePost              = useDeletePost();

  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [showReport,   setShowReport]   = useState(false);

  const isOwner  = user?.uid === post.authorId;
  const VisIcon  = visibilityIcon[post.visibility];
  const longText = post.content.length > 280;

  useEffect(() => {
    if (!user) return;
    isPostSaved(user.uid, post.id).then(setSaved);
  }, [post.id, user]);

  async function handleSave() {
    if (!user) return;
    const nowSaved = await toggleSavePost(user.uid, post.id);
    setSaved(nowSaved);
    toast.success(nowSaved ? "পোস্ট সেভ হয়েছে" : "সেভ তালিকা থেকে সরানো হয়েছে");
  }

  async function handleShare() {
    try {
      await navigator.share({ title: post.authorName, text: post.content });
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success("লিংক কপি হয়েছে");
    }
  }

  const createdDate = (post.createdAt as any)?.toDate?.() ?? new Date();
  const contentParts = renderWithHashtags(
    longText && !expanded ? post.content.slice(0, 280) + "..." : post.content
  );

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.authorId}`}>
              <Avatar src={post.authorPhoto} name={post.authorName} size="md" />
            </Link>
            <div>
              <Link href={`/profile/${post.authorId}`}>
                <p className="font-semibold text-sm text-gray-900 dark:text-white hover:underline">
                  {post.authorName}
                </p>
              </Link>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>{formatDate(createdDate)}</span>
                <span>·</span>
                <VisIcon className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 card shadow-lg w-44 overflow-hidden z-10">
                <button
                  onClick={() => { handleSave(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Bookmark className={cn("w-4 h-4", saved && "fill-current text-primary-600")} />
                  {saved ? "সেভ থেকে সরান" : "পোস্ট সেভ করুন"}
                </button>
                {!isOwner && (
                  <button
                    onClick={() => { setShowReport(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                               text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Flag className="w-4 h-4" />রিপোর্ট করুন
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => { setShowMenu(false); deletePost.mutate(post.id); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                               text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />পোস্ট মুছুন
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content with hashtags */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="text-[15px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
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
                className="text-primary-600 text-sm font-medium mt-1 hover:underline"
              >
                {expanded ? "কম দেখুন" : "আরও দেখুন"}
              </button>
            )}
          </div>
        )}

        {/* Media grid */}
        {post.mediaUrls?.length > 0 && (
          <div className={cn(
            "grid gap-0.5",
            post.mediaUrls.length === 1 && "grid-cols-1",
            post.mediaUrls.length === 2 && "grid-cols-2",
            post.mediaUrls.length >= 3 && "grid-cols-2"
          )}>
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className={cn(
                  "relative bg-gray-100 dark:bg-gray-800 overflow-hidden",
                  post.mediaUrls.length === 1 ? "aspect-video" : "aspect-square"
                )}
              >
                <Image src={url} alt="" fill className="object-cover" />
                {i === 3 && post.mediaUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">+{post.mediaUrls.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {(count > 0 || post.commentsCount > 0) && (
          <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
            {count > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <Heart className="w-2.5 h-2.5 text-white fill-white" />
                </span>
                <span>{count}</span>
              </div>
            )}
            {post.commentsCount > 0 && (
              <button onClick={() => setShowComments(!showComments)} className="ml-auto hover:underline">
                {post.commentsCount} টি মন্তব্য
              </button>
            )}
          </div>
        )}

        <hr className="border-gray-100 dark:border-gray-800 mx-4" />

        {/* Actions */}
        <div className="flex px-2 py-1">
          <button
            onClick={toggle}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all",
              liked
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Heart className={cn("w-5 h-5", liked && "fill-red-500")} />লাইক
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm
                       font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />মন্তব্য
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm
                       font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 className="w-5 h-5" />শেয়ার
          </button>
        </div>

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
