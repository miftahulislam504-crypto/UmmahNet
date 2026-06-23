"use client";
import React from "react";

import { useState, useRef, useCallback } from "react";
import { useRouter }                     from "next/navigation";
import Image                             from "next/image";
import {
  ImageIcon, X, Globe, Users, Lock, ChevronDown,
  ArrowLeft, Plus, Trash2, AlignLeft, GitBranch,
  HelpCircle, BarChart2, Quote, FileText, Sparkles,
} from "lucide-react";
import { Avatar }             from "@/components/ui/Avatar";
import { Button }             from "@/components/ui/Button";
import { useAuthStore }       from "@/store/authStore";
import { useCreatePost, useCreateThread } from "@/hooks/usePosts";
import type { Post, PostType } from "@/types";
import { cn }                 from "@/lib/utils";

// ── Post type config ──────────────────────────────────────────────────────────
const POST_TYPES: {
  type:   PostType;
  label:  string;
  icon:   React.ElementType;
  color:  string;
  bg:     string;
  hint:   string;
}[] = [
  {
    type:  "text",
    label: "Post",
    icon:  AlignLeft,
    color: "#9f67fa",
    bg:    "rgba(124,58,237,0.15)",
    hint:  "কী ভাবছেন লিখুন…",
  },
  {
    type:  "thread",
    label: "Thread",
    icon:  GitBranch,
    color: "#60a5fa",
    bg:    "rgba(96,165,250,0.15)",
    hint:  "Series পোস্ট তৈরি করুন…",
  },
  {
    type:  "question",
    label: "Question",
    icon:  HelpCircle,
    color: "#34d399",
    bg:    "rgba(52,211,153,0.15)",
    hint:  "কমিউনিটিকে প্রশ্ন করুন…",
  },
  {
    type:  "poll",
    label: "Poll",
    icon:  BarChart2,
    color: "#f59e0b",
    bg:    "rgba(245,158,11,0.15)",
    hint:  "ভোট নিন…",
  },
  {
    type:  "quote",
    label: "Quote",
    icon:  Quote,
    color: "#f472b6",
    bg:    "rgba(244,114,182,0.15)",
    hint:  "অনুপ্রেরণামূলক কথা লিখুন…",
  },
  {
    type:  "article",
    label: "Article",
    icon:  FileText,
    color: "#fb923c",
    bg:    "rgba(251,146,60,0.15)",
    hint:  "দীর্ঘ লেখা শুরু করুন…",
  },
];

const VIS_OPTIONS: { value: Post["visibility"]; label: string; icon: typeof Globe }[] = [
  { value: "public",  label: "সবার জন্য", icon: Globe },
  { value: "friends", label: "বন্ধুরা",    icon: Users },
  { value: "private", label: "শুধু আমি",  icon: Lock  },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatePostPage() {
  const router      = useRouter();
  const { profile } = useAuthStore();
  const createPost  = useCreatePost();
  const createThread = useCreateThread();

  const [postType,    setPostType]    = useState<PostType>("text");
  const [content,     setContent]     = useState("");
  const [files,       setFiles]       = useState<File[]>([]);
  const [previews,    setPreviews]    = useState<string[]>([]);
  const [visibility,  setVisibility]  = useState<Post["visibility"]>("public");
  const [showVis,     setShowVis]     = useState(false);
  const [showTypes,   setShowTypes]   = useState(false);

  // Thread
  const [threadParts, setThreadParts] = useState<string[]>(["", ""]);

  // Poll
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Article
  const [articleTitle, setArticleTitle] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const currentType = POST_TYPES.find((t) => t.type === postType)!;
  const vis         = VIS_OPTIONS.find((o) => o.value === visibility)!;

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(i: number) {
    setFiles((p)    => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  // Thread helpers
  function updateThreadPart(i: number, val: string) {
    setThreadParts((prev) => prev.map((p, idx) => idx === i ? val : p));
  }
  function addThreadPart() {
    if (threadParts.length >= 10) return;
    setThreadParts((prev) => [...prev, ""]);
  }
  function removeThreadPart(i: number) {
    if (threadParts.length <= 2) return;
    setThreadParts((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Poll helpers
  function updatePollOption(i: number, val: string) {
    setPollOptions((prev) => prev.map((o, idx) => idx === i ? val : o));
  }
  function addPollOption() {
    if (pollOptions.length >= 6) return;
    setPollOptions((prev) => [...prev, ""]);
  }
  function removePollOption(i: number) {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function isSubmittable() {
    if (postType === "thread")   return threadParts.some((p) => p.trim().length > 0);
    if (postType === "poll")     return content.trim() && pollOptions.filter((o) => o.trim()).length >= 2;
    if (postType === "article")  return articleTitle.trim() && content.trim();
    return content.trim().length > 0 || files.length > 0;
  }

  async function handleSubmit() {
    if (!isSubmittable()) return;

    if (postType === "thread") {
      const parts = threadParts.filter((p) => p.trim().length > 0);
      await createThread.mutateAsync({ parts, visibility });
    } else if (postType === "poll") {
      const opts = pollOptions.filter((o) => o.trim().length > 0);
      await createPost.mutateAsync({
        content, files, visibility, type: "poll", pollOptions: opts,
      });
    } else if (postType === "article") {
      await createPost.mutateAsync({
        content, files, visibility, type: "article", articleTitle,
      });
    } else {
      await createPost.mutateAsync({ content, files, visibility, type: postType });
    }
    router.push("/");
  }

  const isLoading = createPost.isPending || createThread.isPending;

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="card flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-100 text-lg flex-1">পোস্ট তৈরি করুন</h1>
        <Button
          size="sm"
          loading={isLoading}
          disabled={!isSubmittable()}
          onClick={handleSubmit}
        >
          <Sparkles className="w-3.5 h-3.5" />
          পোস্ট করুন
        </Button>
      </div>

      {/* Type selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-0.5">
        {POST_TYPES.map(({ type, label, icon: Icon, color, bg }) => (
          <button
            key={type}
            onClick={() => setPostType(type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                       flex-shrink-0 transition-all duration-200 active:scale-95"
            style={{
              color,
              background: postType === type ? bg : "rgba(255,255,255,0.05)",
              border:     postType === type
                ? `1px solid ${color}40`
                : "1px solid rgba(255,255,255,0.06)",
              boxShadow:  postType === type ? `0 0 12px ${color}25` : "none",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Body card */}
      <div className="card p-4 flex flex-col gap-4">

        {/* Author + visibility */}
        <div className="flex items-center gap-3">
          <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
          <div>
            <p className="font-semibold text-[14px] text-gray-100">{profile.displayName}</p>
            <div className="relative mt-0.5">
              <button
                onClick={() => setShowVis(!showVis)}
                className="flex items-center gap-1 text-[11px] font-semibold
                           text-primary-400 px-2 py-0.5 rounded-lg transition-all"
                style={{ background: "rgba(124,58,237,0.15)" }}
              >
                <vis.icon className="w-3 h-3" />
                {vis.label}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showVis && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVis(false)} />
                  <div
                    className="absolute top-7 left-0 z-20 w-40 rounded-2xl overflow-hidden"
                    style={{
                      background:     "rgba(20,17,40,0.96)",
                      backdropFilter: "blur(20px)",
                      border:         "1px solid rgba(255,255,255,0.1)",
                      boxShadow:      "0 16px 48px rgba(0,0,0,0.5)",
                      animation:      "fadeUp 0.2s ease-out",
                    }}
                  >
                    {VIS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setVisibility(opt.value); setShowVis(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors text-left"
                        style={
                          visibility === opt.value
                            ? { color: "#c4b5fd", background: "rgba(124,58,237,0.2)" }
                            : { color: "#9ca3af" }
                        }
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── NORMAL POST / QUESTION / QUOTE ── */}
        {(postType === "text" || postType === "question" || postType === "quote" || postType === "image") && (
          <>
            {postType === "quote" && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm italic"
                style={{
                  background:  "rgba(244,114,182,0.08)",
                  border:      "1px solid rgba(244,114,182,0.2)",
                  borderLeft:  "3px solid #f472b6",
                  color:       "#f9a8d4",
                }}
              >
                একটি অনুপ্রেরণামূলক উদ্ধৃতি
              </div>
            )}

            {postType === "question" && (
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                কমিউনিটি আপনার প্রশ্নের উত্তর দেবে
              </p>
            )}

            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={currentType.hint}
              rows={postType === "quote" ? 3 : 6}
              className="w-full bg-transparent text-gray-200 placeholder-gray-600
                         resize-none outline-none text-[16px] leading-relaxed"
            />
            {content.length > 0 && (
              <p className="text-[11px] text-right"
                style={{ color: content.length > 900 ? "#ef4444" : "#6b7280" }}>
                {content.length} / 1000
              </p>
            )}
          </>
        )}

        {/* ── THREAD ── */}
        {postType === "thread" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Thread — একাধিক connected পোস্ট
            </p>
            {threadParts.map((part, i) => (
              <div key={i} className="flex gap-2.5">
                {/* connector line */}
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa" }}
                  >
                    {i + 1}
                  </div>
                  {i < threadParts.length - 1 && (
                    <div className="w-px flex-1 mt-1" style={{ background: "rgba(96,165,250,0.25)" }} />
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={part}
                    onChange={(e) => updateThreadPart(i, e.target.value)}
                    placeholder={`পার্ট ${i + 1}…`}
                    rows={3}
                    className="w-full bg-transparent text-gray-200 placeholder-gray-600
                               resize-none outline-none text-[15px] leading-relaxed"
                  />
                  {threadParts.length > 2 && (
                    <button
                      onClick={() => removeThreadPart(i)}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"
                    >
                      <Trash2 className="w-3 h-3" /> সরান
                    </button>
                  )}
                </div>
              </div>
            ))}
            {threadParts.length < 10 && (
              <button
                onClick={addThreadPart}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300
                           font-medium transition-colors self-start"
              >
                <Plus className="w-4 h-4" /> পার্ট যোগ করুন
              </button>
            )}
          </div>
        )}

        {/* ── POLL ── */}
        {postType === "poll" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Poll question
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন…"
              rows={2}
              className="w-full bg-transparent text-gray-200 placeholder-gray-600
                         resize-none outline-none text-[16px] leading-relaxed"
            />
            <div className="flex flex-col gap-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`অপশন ${i + 1}`}
                    maxLength={60}
                    className="input flex-1 py-2"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => removePollOption(i)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 6 && (
              <button
                onClick={addPollOption}
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300
                           font-medium transition-colors self-start"
              >
                <Plus className="w-4 h-4" /> অপশন যোগ করুন
              </button>
            )}
          </div>
        )}

        {/* ── ARTICLE ── */}
        {postType === "article" && (
          <div className="flex flex-col gap-3">
            <input
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              placeholder="আর্টিকেলের শিরোনাম…"
              maxLength={120}
              className="input text-base font-semibold py-3"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="লেখা শুরু করুন…"
              rows={10}
              className="w-full bg-transparent text-gray-200 placeholder-gray-600
                         resize-none outline-none text-[15px] leading-relaxed"
            />
            {content.length > 0 && (
              <p className="text-[11px] text-gray-600">
                ~{Math.ceil(content.split(/\s+/).length / 200)} মিনিট পড়তে লাগবে
              </p>
            )}
          </div>
        )}

        {/* Media previews (for text/question/quote) */}
        {(postType === "text" || postType === "question") && previews.length > 0 && (
          <div className={`grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden"
                style={{ aspectRatio: "4/3" }}
              >
                <Image src={src} alt="" fill className="object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full
                             flex items-center justify-center text-white active:scale-90"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="divider" />

        {/* Toolbar — photo upload for appropriate types */}
        {(postType === "text" || postType === "question" || postType === "article") && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2.5">যুক্ত করুন</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           transition-all active:scale-95"
                style={{
                  color:      "#10b981",
                  background: "rgba(16,185,129,0.12)",
                  border:     "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <ImageIcon className="w-4 h-4" />
                ছবি
              </button>
              <input
                ref={fileRef} type="file" accept="image/*" multiple
                className="hidden" onChange={handleFiles}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
