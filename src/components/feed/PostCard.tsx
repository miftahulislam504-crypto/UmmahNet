"use client";

import { useState, useEffect, useRef }  from "react";
import Link                             from "next/link";
import Image                            from "next/image";
import {
  MessageCircle, Send, Bookmark,
  MoreHorizontal, Trash2, Globe, Users, Lock, Flag,
  ChevronLeft, ChevronRight, UserX, UserCheck,
  Sparkles, RefreshCcw, GitBranch, HelpCircle,
  Quote, BarChart2, CheckCircle2, FileText,
} from "lucide-react";
import { Avatar }         from "@/components/ui/Avatar";
import { ReportModal }    from "@/components/ui/ReportModal";
import { CommentSection } from "@/components/feed/CommentSection";
import { useLike, useDeletePost, usePollVote } from "@/hooks/usePosts";
import { useHiddenUsers, useToggleBlock } from "@/hooks/useBlocks";
import { useAuthStore }   from "@/store/authStore";
import {
  toggleSavePost, isPostSaved, renderWithHashtags,
} from "@/services/advancedService";
import { formatDate, cn } from "@/lib/utils";
import type { Post }      from "@/types";
import toast              from "react-hot-toast";
import { useRouter }      from "next/navigation";

const visibilityIcon = { public: Globe, friends: Users, private: Lock };

// Per-type badge config
const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  thread:   { icon: GitBranch,   label: "Thread",   color: "#60a5fa" },
  question: { icon: HelpCircle,  label: "Question", color: "#34d399" },
  quote:    { icon: Quote,       label: "Quote",    color: "#f472b6" },
  poll:     { icon: BarChart2,   label: "Poll",     color: "#f59e0b" },
  article:  { icon: FileText,    label: "Article",  color: "#fb923c" },
};

interface Props { post: Post & { id: string } }

export function PostCard({ post }: Props) {
  const { user, profile }        = useAuthStore();
  const router                   = useRouter();
  const { liked, count, toggle } = useLike(post.id, post.benefitsCount ?? post.likesCount ?? 0);
  const deletePost               = useDeletePost();
  const { blockedByMe }          = useHiddenUsers();
  const toggleBlock              = useToggleBlock(post.authorId);
  const isBlockedByMe            = blockedByMe.has(post.authorId);
  const { myVote, vote: castVote, checking: pollChecking } = usePollVote(post.id);

  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [imgIndex,     setImgIndex]     = useState(0);
  const [benefitAnim,  setBenefitAnim]  = useState(false);

  const isOwner    = user?.uid === post.authorId;
  const VisIcon    = visibilityIcon[post.visibility];
  const displayPhoto = isOwner && profile?.photoURL ? profile.photoURL : post.authorPhoto;
  const longText   = post.content.length > 280;
  const imgs       = post.mediaUrls ?? [];
  const typeMeta   = TYPE_META[post.type];

  useEffect(() => {
    if (!user) return;
    isPostSaved(user.uid, post.id).then(setSaved);
  }, [post.id, user]);

  async function handleSave() {
    if (!user) return;
    const nowSaved = await toggleSavePost(user.uid, post.id);
    setSaved(nowSaved);
    toast.success(nowSaved ? "সেভ হয়েছে ✨" : "সেভ থেকে সরানো হয়েছে");
  }

  async function handleShare() {
    try {
      await navigator.share({ title: post.authorName, text: post.content });
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success("লিংক কপি হয়েছে");
    }
  }

  const lastTap = useRef(0);
  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) toggle();
      setBenefitAnim(true);
      setTimeout(() => setBenefitAnim(false), 900);
    }
    lastTap.current = now;
  }

  const createdDate = (post.createdAt as any)?.toDate?.() ?? new Date();

  const contentParts = renderWithHashtags(
    longText && !expanded ? post.content.slice(0, 280) + "…" : post.content
  );

  // Poll total votes
  const pollTotal = (post.pollOptions ?? []).reduce((sum, o) => sum + (o.votes ?? 0), 0);

  return (
    <>
      <article className="card feed-item overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.authorId}`} className="flex-shrink-0">
              <Avatar src={displayPhoto} name={post.authorName} size="md" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/profile/${post.authorId}`}>
                  <p className="font-semibold text-[13px] text-gray-100 leading-tight hover:text-primary-300 transition-colors">
                    {post.authorName}
                  </p>
                </Link>
                {/* Type badge */}
                {typeMeta && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                    style={{ color: typeMeta.color, background: `${typeMeta.color}18` }}
                  >
                    <typeMeta.icon className="w-2.5 h-2.5" />
                    {typeMeta.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                <VisIcon className="w-3 h-3" />
                <span>{formatDate(createdDate)}</span>
              </div>
            </div>
          </div>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 transition-all duration-200"
              style={{ background: showMenu ? "rgba(124,58,237,0.15)" : undefined }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-10 w-52 z-20 overflow-hidden rounded-2xl"
                  style={{
                    background:     "rgba(20,17,40,0.96)",
                    backdropFilter: "blur(20px)",
                    border:         "1px solid rgba(255,255,255,0.1)",
                    boxShadow:      "0 16px 48px rgba(0,0,0,0.5)",
                    animation:      "fadeUp 0.2s ease-out",
                  }}
                >
                  <button
                    onClick={() => { handleSave(); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300
                               hover:bg-primary-600/15 hover:text-primary-300 transition-all text-left"
                  >
                    <Bookmark className={cn("w-4 h-4", saved && "fill-current text-primary-400")} />
                    {saved ? "সেভ থেকে সরান" : "পোস্ট সেভ করুন"}
                  </button>
                  <div className="divider mx-3" />
                  {!isOwner && (
                    <>
                      <button
                        onClick={() => { setShowReport(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                   text-red-400 hover:bg-red-500/10 transition-all text-left"
                      >
                        <Flag className="w-4 h-4" /> রিপোর্ট করুন
                      </button>
                      <button
                        onClick={() => { toggleBlock.mutate(); setShowMenu(false); }}
                        disabled={toggleBlock.isPending}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                   text-red-400 hover:bg-red-500/10 transition-all text-left"
                      >
                        {isBlockedByMe
                          ? <UserCheck className="w-4 h-4" />
                          : <UserX className="w-4 h-4" />}
                        {isBlockedByMe ? "আনব্লক" : "ব্লক"} করুন
                      </button>
                    </>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowMenu(false); deletePost.mutate(post.id); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm
                                 text-red-400 hover:bg-red-500/10 transition-all text-left"
                    >
                      <Trash2 className="w-4 h-4" /> মুছে ফেলুন
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Article title ── */}
        {post.type === "article" && post.articleTitle && (
          <div className="px-4 pb-2">
            <h3 className="font-bold text-gray-100 text-lg leading-snug">{post.articleTitle}</h3>
          </div>
        )}

        {/* ── Quote card ── */}
        {post.type === "quote" && (
          <div
            className="mx-4 mb-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(244,114,182,0.07)",
              border:     "1px solid rgba(244,114,182,0.2)",
              borderLeft: "3px solid #f472b6",
            }}
          >
            <p className="text-gray-200 text-[15px] leading-relaxed italic">"{post.content}"</p>
          </div>
        )}

        {/* ── Thread index badge ── */}
        {post.type === "thread" && post.threadIndex && post.threadIndex > 1 && (
          <div className="px-4 pb-1">
            <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Thread · পার্ট {post.threadIndex}
            </span>
          </div>
        )}

        {/* ── Caption (skip for quote since content is in quote card) ── */}
        {post.type !== "quote" && post.content && (
          <div className="px-4 pb-3">
            <p className="text-[14px] text-gray-200 leading-relaxed whitespace-pre-wrap">
              {contentParts.map((part, i) =>
                part.type === "hashtag" ? (
                  <button
                    key={i}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(part.value)}`)}
                    className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
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
                className="text-primary-500 hover:text-primary-400 text-[13px] mt-1 transition-colors"
              >
                {expanded ? "কম দেখুন" : "আরো দেখুন"}
              </button>
            )}
          </div>
        )}

        {/* ── Poll ── */}
        {post.type === "poll" && post.pollOptions && !pollChecking && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {post.pollOptions.map((opt) => {
              const pct     = pollTotal > 0 ? Math.round((opt.votes / pollTotal) * 100) : 0;
              const isVoted = myVote === opt.id;
              const voted   = !!myVote;

              return (
                <button
                  key={opt.id}
                  onClick={() => !voted && castVote(opt.id)}
                  disabled={voted}
                  className="relative w-full rounded-xl overflow-hidden text-left transition-all
                             active:scale-[0.99]"
                  style={{
                    border:     isVoted
                      ? "1px solid rgba(124,58,237,0.6)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Progress bar */}
                  {voted && (
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-700"
                      style={{
                        width:      `${pct}%`,
                        background: isVoted
                          ? "rgba(124,58,237,0.25)"
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                  <div className="relative px-4 py-2.5 flex items-center justify-between">
                    <span className={cn("text-sm font-medium", isVoted ? "text-primary-300" : "text-gray-200")}>
                      {opt.text}
                      {isVoted && <CheckCircle2 className="inline w-3.5 h-3.5 ml-1.5 text-primary-400" />}
                    </span>
                    {voted && (
                      <span className="text-xs font-bold text-gray-400">{pct}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-[11px] text-gray-600 mt-0.5">{pollTotal} ভোট</p>
          </div>
        )}

        {/* ── Media carousel ── */}
        {imgs.length > 0 && (
          <div
            className="relative select-none overflow-hidden"
            style={{ aspectRatio: imgs.length === 1 ? "4/5" : "1/1", background: "#000" }}
            onClick={handleDoubleTap}
          >
            <Image
              src={imgs[imgIndex]}
              alt=""
              fill
              className="object-contain transition-opacity duration-300"
              unoptimized
            />

            {benefitAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <Sparkles
                  className="text-primary-400 drop-shadow-[0_0_24px_rgba(167,139,250,1)]"
                  style={{ width: 80, height: 80, animation: "fadeUp 0.6s ease-out forwards", opacity: 0 }}
                />
              </div>
            )}

            {imgs.length > 1 && (
              <>
                {imgIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setImgIndex((i) => i - 1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                               flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
                {imgIndex < imgs.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setImgIndex((i) => i + 1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                               flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {imgs.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        i === imgIndex ? "w-4 h-1.5 bg-primary-400" : "w-1.5 h-1.5 bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Engagement row ── */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Benefit */}
            <button
              onClick={toggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-90",
                liked ? "text-primary-300" : "text-gray-500 hover:text-gray-300"
              )}
              style={{
                background: liked ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
              }}
            >
              <Sparkles className={cn("w-4 h-4", liked && "fill-primary-400")} />
              <span className="text-xs">{count > 0 ? count : "Benefit"}</span>
            </button>

            {/* Reflection */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                         text-gray-500 hover:text-gray-300 transition-all duration-200 active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">
                {post.commentsCount > 0 ? post.commentsCount : "Reflection"}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                         text-gray-500 hover:text-gray-300 transition-all duration-200 active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              "p-2 rounded-xl transition-all duration-200 active:scale-90",
              saved ? "text-primary-400" : "text-gray-500 hover:text-gray-300"
            )}
            style={{ background: saved ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)" }}
          >
            <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
          </button>
        </div>

        {/* Timestamp */}
        <div className="px-4 pb-4">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider">
            {formatDate(createdDate)}
          </p>
        </div>

        {/* Show reflections */}
        {post.commentsCount > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="px-4 pb-3 text-[13px] text-gray-500 hover:text-gray-300
                       transition-colors flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {post.commentsCount} টি Reflection দেখুন
          </button>
        )}

        {showComments && (
          <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <CommentSection postId={post.id} isQuestion={post.type === "question"} isOwner={isOwner} />
          </div>
        )}
      </article>

      {showReport && (
        <ReportModal
          targetId={post.id}
          targetType="post"
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
