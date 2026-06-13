"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, X, Globe, Users, Lock, ChevronDown, ArrowLeft } from "lucide-react";
import { Avatar }        from "@/components/ui/Avatar";
import { Button }        from "@/components/ui/Button";
import { useAuthStore }  from "@/store/authStore";
import { useCreatePost } from "@/hooks/usePosts";
import type { Post }     from "@/types";
import Image             from "next/image";

const VISIBILITY_OPTIONS: { value: Post["visibility"]; label: string; icon: typeof Globe }[] = [
  { value: "public",  label: "Everyone", icon: Globe  },
  { value: "friends", label: "Friends",  icon: Users  },
  { value: "private", label: "Only me",  icon: Lock   },
];

export default function CreatePostPage() {
  const router      = useRouter();
  const { profile } = useAuthStore();
  const createPost  = useCreatePost();

  const [content,    setContent]    = useState("");
  const [files,      setFiles]      = useState<File[]>([]);
  const [previews,   setPreviews]   = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Post["visibility"]>("public");
  const [showVis,    setShowVis]    = useState(false);

  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const vis = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(i: number) {
    setFiles((p)    => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!content.trim() && files.length === 0) return;
    await createPost.mutateAsync({ content, files, visibility });
    router.push("/");
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white text-lg flex-1">Create Post</h1>
        <Button
          size="sm"
          loading={createPost.isPending}
          disabled={!content.trim() && files.length === 0}
          onClick={handleSubmit}
        >
          Post
        </Button>
      </div>

      <div className="card p-4 flex flex-col gap-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{profile.displayName}</p>

            {/* Visibility picker */}
            <div className="relative mt-0.5">
              <button
                onClick={() => setShowVis(!showVis)}
                className="flex items-center gap-1 text-xs font-medium text-primary-600
                           bg-primary-50 dark:bg-primary-900/20 rounded-lg px-2 py-0.5 hover:bg-primary-100 transition-colors"
              >
                <vis.icon className="w-3 h-3" />
                {vis.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showVis && (
                <div className="absolute top-7 left-0 card shadow-lg w-36 overflow-hidden z-10">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setVisibility(opt.value); setShowVis(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm
                                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                  ${visibility === opt.value ? "text-primary-600 font-medium" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What's on your mind, ${profile.displayName.split(" ")[0]}?`}
          rows={6}
          className="w-full bg-transparent text-gray-900 dark:text-white
                     placeholder-gray-400 resize-none outline-none text-[16px] leading-relaxed"
        />

        {/* Image previews */}
        {previews.length > 0 && (
          <div className={`grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
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

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Toolbar */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Add to your post</p>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                         text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20
                         dark:hover:bg-green-900/30 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              Photo / Video
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </div>
        </div>
      </div>
    </div>
  );
}
