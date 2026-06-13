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

  const ownIdx = groups.findIndex((g) => g.authorId === user?.uid);

  return (
    <>
      {/* Scrollable story bar — no card wrapper, blends into feed bg */}
      <div className="bg-white dark:bg-gray-900 px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">

          {/* ── Add Story ── */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={createStory.isPending}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[60px] group"
          >
            {/* Avatar with dashed ring + plus badge */}
            <div className="relative w-[58px] h-[58px]">
              {/* Outer gradient placeholder (dashed when own, solid gradient when has story) */}
              <div className="w-full h-full rounded-full p-[2.5px]
                              bg-gradient-to-tr from-blue-400 via-blue-500 to-blue-600">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800
                                  flex items-center justify-center">
                    {createStory.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt=""
                        width={52} height={52}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-base font-bold text-blue-600">
                        {profile.displayName?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Blue plus badge — bottom right */}
              <div className="absolute -bottom-0.5 -right-0.5 w-[20px] h-[20px]
                              bg-blue-500 rounded-full border-2 border-white dark:border-gray-900
                              flex items-center justify-center shadow-sm">
                <Plus className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>

            <span className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-tight text-center w-full truncate">
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
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[60px]">
              <div className="w-[58px] h-[58px] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-9 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          ))}

          {/* ── Story groups ── */}
          {!loading && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;

            return (
              <button
                key={group.authorId}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[60px]"
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
              >
                {/* Avatar */}
                <div className="relative w-[58px] h-[58px]">
                  {/* Gradient ring — vivid when unviewed, muted when viewed */}
                  <div className={cn(
                    "w-full h-full rounded-full p-[2.5px]",
                    group.hasUnviewed
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}>
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700
                                      flex items-center justify-center">
                        {group.authorPhoto ? (
                          <Image
                            src={group.authorPhoto}
                            alt={group.authorName}
                            width={52} height={52}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                            {group.authorName?.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <span className={cn(
                  "text-[10.5px] leading-tight text-center w-full truncate",
                  group.hasUnviewed
                    ? "text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-500 dark:text-gray-400 font-normal"
                )}>
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
