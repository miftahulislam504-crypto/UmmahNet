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
      <div className="bg-white dark:bg-gray-900 px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">

          {/* ── Add Story ── */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={createStory.isPending}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 select-none"
          >
            {/* Circle with + badge */}
            <div className="relative w-[60px] h-[60px]">
              {/* Avatar circle */}
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700">
                {profile.photoURL ? (
                  <Image src={profile.photoURL} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center
                                  bg-gradient-to-br from-gray-300 to-gray-400
                                  dark:from-gray-600 dark:to-gray-700 text-white font-bold text-lg">
                    {profile.displayName?.charAt(0)}
                  </div>
                )}
              </div>

              {/* Plus badge — bottom right */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full
                              bg-primary-600 border-2 border-white dark:border-gray-900
                              flex items-center justify-center shadow">
                {createStory.isPending
                  ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                  : <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                }
              </div>
            </div>

            {/* Label */}
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight w-[64px] truncate">
              Add story
            </span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFile}
          />

          {/* ── Loading skeletons ── */}
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-[60px] h-[60px] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-10 h-2.5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ))}

          {/* ── Story circles ── */}
          {!loading && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;
            const hasNew = group.hasUnviewed;
            return (
              <button
                key={group.authorId}
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 select-none"
              >
                {/* Ring + avatar */}
                <div className={cn(
                  "w-[60px] h-[60px] rounded-full p-[2.5px]",
                  hasNew
                    ? "bg-gradient-to-tr from-primary-500 via-purple-500 to-pink-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}>
                  <div className="w-full h-full rounded-full overflow-hidden
                                  border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700">
                    {group.authorPhoto ? (
                      <Image
                        src={group.authorPhoto}
                        alt={group.authorName}
                        width={56} height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center
                                      bg-gradient-to-br from-purple-400 to-pink-500
                                      text-white font-bold text-lg">
                        {group.authorName?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name */}
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300
                                 text-center leading-tight w-[64px] truncate">
                  {group.authorName.split(" ")[0]}
                </span>
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
