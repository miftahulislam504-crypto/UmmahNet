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
      <div className="bg-white dark:bg-gray-900 px-3 pt-3 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">

          {/* ── Create Story Card ── */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={createStory.isPending}
            className="relative flex-shrink-0 w-[100px] h-[160px] rounded-xl overflow-hidden
                       bg-gray-100 dark:bg-gray-800 group"
          >
            {/* Background: user photo or gradient */}
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt=""
                fill
                className="object-cover brightness-75"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800" />
            )}

            {/* Plus button — center top area */}
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-[70%]">
              {createStory.isPending ? (
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center
                                border-4 border-white shadow-md">
                  <Plus className="w-5 h-5 text-white" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Label at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 pt-5 pb-2 px-1">
              <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 text-center block leading-tight">
                Create story
              </span>
            </div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFile}
          />

          {/* ── Loading skeletons ── */}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[100px] h-[160px] rounded-xl
                         bg-gray-200 dark:bg-gray-700 animate-pulse"
            />
          ))}

          {/* ── Story cards ── */}
          {!loading && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;

            return (
              <button
                key={group.authorId}
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
                className="relative flex-shrink-0 w-[100px] h-[160px] rounded-xl overflow-hidden
                           bg-gray-200 dark:bg-gray-700"
              >
                {/* Story background image */}
                {group.authorPhoto ? (
                  <Image
                    src={group.authorPhoto}
                    alt={group.authorName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-400 to-pink-500" />
                )}

                {/* Dark gradient overlay — bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

                {/* Avatar — top left with ring */}
                <div className={cn(
                  "absolute top-2 left-2 w-9 h-9 rounded-full p-[2px]",
                  group.hasUnviewed
                    ? "bg-blue-500"
                    : "bg-gray-400"
                )}>
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gray-300">
                    {group.authorPhoto ? (
                      <Image
                        src={group.authorPhoto}
                        alt={group.authorName}
                        width={32} height={32}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center
                                      bg-purple-500 text-white font-bold text-sm">
                        {group.authorName?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name — bottom */}
                <div className="absolute bottom-2 left-1.5 right-1.5">
                  <span className="text-white text-[11px] font-semibold leading-tight line-clamp-2 text-left drop-shadow">
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
