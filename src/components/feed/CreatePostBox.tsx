"use client";
import React from "react";

import { useState, useRef } from "react";
import { ImageIcon, X, Globe, Users, Lock, ChevronDown, Loader2 } from "lucide-react";
import { Avatar }        from "@/components/ui/Avatar";
import { Button }        from "@/components/ui/Button";
import { useAuthStore }  from "@/store/authStore";
import { useCreatePost } from "@/hooks/usePosts";
import type { Post }     from "@/types";
import Image             from "next/image";

const VISIBILITY_OPTIONS: { value: Post["visibility"]; label: string; icon: typeof Globe }[] = [
  { value: "public",  label: "সবাই",       icon: Globe  },
  { value: "friends", label: "বন্ধুরা",    icon: Users  },
  { value: "private", label: "শুধু আমি",   icon: Lock   },
];

export function CreatePostBox() {
  const { profile }   = useAuthStore();
  const createPost    = useCreatePost();

  const [expanded,    setExpanded]    = useState(false);
  const [content,     setContent]     = useState("");
  const [files,       setFiles]       = useState<File[]>([]);
  const [previews,    setPreviews]    = useState<string[]>([]);
  const [visibility,  setVisibility]  = useState<Post["visibility"]>("public");
  const [showVis,     setShowVis]     = useState(false);

  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const vis = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(i: number) {
    setFiles((prev)    => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!content.trim() && files.length === 0) return;
    await createPost.mutateAsync({ content, files, visibility });
    setContent("");
    setFiles([]);
    setPreviews([]);
    setExpanded(false);
  }

  if (!profile) return null;

  return (
    <div className="card p-4">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
        <button
          onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
          className="flex-1 text-left bg-gray-100 dark:bg-gray-800 rounded-full
                     px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-200
                     dark:hover:bg-gray-700 transition-colors"
        >
          কী ভাবছেন, {profile.displayName.split(" ")[0]}?
        </button>
      </div>

      {/* Expanded composer */}
      {expanded && (
        <div className="mt-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`কী ভাবছেন, ${profile.displayName.split(" ")[0]}?`}
            rows={3}
            className="w-full bg-transparent text-gray-900 dark:text-white
                       placeholder-gray-400 resize-none outline-none text-[15px]
                       leading-relaxed"
          />

          {/* Image previews */}
          {previews.length > 0 && (
            <div className={`mt-3 grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <Image src={src} alt="" fill className="object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white
                               rounded-full flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="border-gray-100 dark:border-gray-800 my-3" />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Image upload */}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                           text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20
                           font-medium transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">ছবি</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

              {/* Visibility picker */}
              <div className="relative">
                <button
                  onClick={() => setShowVis(!showVis)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                             text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20
                             font-medium transition-colors"
                >
                  <vis.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{vis.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showVis && (
                  <div className="absolute bottom-10 left-0 card shadow-lg w-36 overflow-hidden z-10">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setVisibility(opt.value); setShowVis(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm
                                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                    ${visibility === opt.value ? "text-primary-600 font-medium" : ""}`}
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setExpanded(false); setContent(""); setFiles([]); setPreviews([]); }}>
                বাতিল
              </Button>
              <Button
                size="sm"
                loading={createPost.isPending}
                disabled={!content.trim() && files.length === 0}
                onClick={handleSubmit}
              >
                পোস্ট করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed toolbar */}
      {!expanded && (
        <>
          <hr className="border-gray-100 dark:border-gray-800 my-3" />
          <div className="flex">
            <button
              onClick={() => { setExpanded(true); fileRef.current?.click(); }}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl
                         text-sm text-gray-600 dark:text-gray-400 font-medium
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-green-500" />
              ছবি/ভিডিও
            </button>
          </div>
        </>
      )}
    </div>
  );
}
