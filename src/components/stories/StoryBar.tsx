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

          {/* ── Add Story card ── */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={createStory.isPending}
            className="relative flex-shrink-0 w-[72px] h-[118px] rounded-xl overflow-hidden
                       bg-gray-200 dark:bg-gray-700 select-none"
          >
            {/* BG: user photo */}
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt="" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-400
                              dark:from-gray-600 dark:to-gray-700" />
            )}

            {/* Bottom dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            {/* Plus badge — bottom left, on top of gradient */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-8 h-8 rounded-full bg-blue-500 border-[3px] border-white
                              dark:border-gray-900 flex items-center justify-center shadow-md">
                {createStory.isPending
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                }
              </div>
            </div>

            {/* Name label — very bottom */}
            <div className="absolute bottom-1.5 left-0 right-0 px-1">
              <span className="block text-white text-[10px] font-semibold text-center
                               leading-tight drop-shadow-md truncate">
                Add story
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
              className="flex-shrink-0 w-[72px] h-[118px] rounded-xl
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
                className="relative flex-shrink-0 w-[72px] h-[118px] rounded-xl overflow-hidden
                           bg-gray-300 dark:bg-gray-700 select-none"
              >
                {/* BG photo */}
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

                {/* Dark gradient overlay — bottom heavy */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Avatar — bottom left with ring */}
                <div className="absolute bottom-7 left-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full p-[2px]",
                    group.hasUnviewed
                      ? "bg-blue-500"
                      : "bg-gray-400 dark:bg-gray-500"
                  )}>
                    <div className="w-full h-full rounded-full overflow-hidden
                                    border-2 border-white dark:border-gray-900 bg-gray-200">
                      {group.authorPhoto ? (
                        <Image
                          src={group.authorPhoto}
                          alt=""
                          width={28} height={28}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center
                                        bg-purple-500 text-white font-bold text-[10px]">
                          {group.authorName?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name — very bottom */}
                <div className="absolute bottom-1.5 left-1 right-1">
                  <span className={cn(
                    "block text-[10px] font-semibold leading-tight truncate drop-shadow-md",
                    "text-white"
                  )}>
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
