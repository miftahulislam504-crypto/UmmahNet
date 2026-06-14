"use client";

import { useState, useRef }   from "react";
import Image                   from "next/image";
import { Plus, Loader2 }      from "lucide-react";
import { StoryViewer }        from "@/components/stories/StoryViewer";
import { useStories, useCreateStory } from "@/hooks/useStories";
import { useAuthStore }       from "@/store/authStore";
import { cn }                 from "@/lib/utils";

export function StoryBar() {
  const { user, profile }               = useAuthStore();
  const { groups, loading, markViewed } = useStories();
  const createStory                     = useCreateStory();
  const [viewerOpen,  setViewerOpen]    = useState(false);
  const [viewerGroup, setViewerGroup]   = useState(0);
  const fileRef                         = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await createStory.mutateAsync({ file, caption: "" });
    e.target.value = "";
  }

  if (!profile) return null;

  return (
    <>
      <div className="bg-white dark:bg-gray-900 px-3 py-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">

          {/* ── Create Story ── */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={createStory.isPending}
            className="relative flex-shrink-0 w-[80px] h-[130px] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700"
          >
            {/* BG photo */}
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt="" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700" />
            )}

            {/* bottom white strip */}
            <div className="absolute bottom-0 left-0 right-0 h-[42px] bg-white dark:bg-gray-900" />

            {/* plus circle — sits on border of photo & strip */}
            <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 translate-y-1/2
                            w-7 h-7 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900
                            flex items-center justify-center z-10 shadow">
              {createStory.isPending
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              }
            </div>

            {/* label */}
            <div className="absolute bottom-0 left-0 right-0 h-[28px] flex items-end justify-center pb-1.5">
              <span className="text-[10px] font-semibold text-gray-800 dark:text-gray-200 leading-none">
                Add story
              </span>
            </div>
          </button>

          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

          {/* ── Skeletons ── */}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[80px] h-[130px] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}

          {/* ── Story cards ── */}
          {!loading && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;
            return (
              <button
                key={group.authorId}
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
                className="relative flex-shrink-0 w-[80px] h-[130px] rounded-xl overflow-hidden bg-gray-300 dark:bg-gray-700"
              >
                {/* BG */}
                {group.authorPhoto
                  ? <Image src={group.authorPhoto} alt={group.authorName} fill className="object-cover" />
                  : <div className="absolute inset-0 bg-gradient-to-b from-purple-400 to-pink-500" />
                }

                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />

                {/* avatar top-left with ring */}
                <div className="absolute top-1.5 left-1.5">
                  <div className={cn(
                    "w-7 h-7 rounded-full p-[2px]",
                    group.hasUnviewed ? "bg-blue-500" : "bg-gray-400"
                  )}>
                    <div className="w-full h-full rounded-full overflow-hidden border border-white bg-gray-300">
                      {group.authorPhoto
                        ? <Image src={group.authorPhoto} alt="" width={24} height={24} className="object-cover w-full h-full" />
                        : <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-[10px]">
                            {group.authorName?.charAt(0)}
                          </div>
                      }
                    </div>
                  </div>
                </div>

                {/* name bottom */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <span className="text-white text-[10px] font-semibold leading-tight line-clamp-2 text-left drop-shadow-md">
                    {group.authorName.split(" ")[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {viewerOpen && (
        <StoryViewer
          groups={groups}
          initialGroup={viewerGroup}
          onClose={() => setViewerOpen(false)}
          onView={markViewed}
        />
      )}
    </>
  );
}
