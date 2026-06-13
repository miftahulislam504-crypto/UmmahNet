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

  // Index-safe own group finder for viewer
  const ownIdx = groups.findIndex((g) => g.authorId === user?.uid);

  return (
    <>
      <div className="card p-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">

          {/* Add story button */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={createStory.isPending}
              className="relative w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800
                         flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700
                         transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600"
            >
              {createStory.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              ) : (
                <>
                  {profile.photoURL ? (
                    <Image src={profile.photoURL} alt="" fill className="object-cover rounded-full" />
                  ) : (
                    <span className="text-lg font-bold text-primary-600">
                      {profile.displayName?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary-600
                                  rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </>
              )}
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
              আপনার স্টোরি
            </span>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

          {/* Loading skeletons — max 3 seconds timeout via CSS */}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-10 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          ))}

          {/* Story groups (others only) */}
          {!loading && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;
            return (
              <div
                key={group.authorId}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 cursor-pointer"
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5",
                  group.hasUnviewed
                    ? "bg-gradient-to-tr from-primary-500 to-purple-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}>
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-gray-900 bg-gray-200">
                    {group.authorPhoto ? (
                      <Image
                        src={group.authorPhoto}
                        alt={group.authorName}
                        width={52} height={52}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center
                                      bg-primary-100 text-primary-700 font-bold text-lg">
                        {group.authorName?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 text-center leading-tight w-full truncate">
                  {group.authorName.split(" ")[0]}
                </span>
              </div>
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
