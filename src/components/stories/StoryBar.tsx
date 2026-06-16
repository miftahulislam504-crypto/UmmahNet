"use client";

import { useState, useRef }   from "react";
import Image                   from "next/image";
import { Plus, Loader2 }      from "lucide-react";
import { StoryViewer }        from "@/components/stories/StoryViewer";
import { useStories, useCreateStory } from "@/hooks/useStories";
import { useAuthStore }       from "@/store/authStore";
import { cn }                 from "@/lib/utils";

// ── Card size + overlapping avatar size ─────────────────────────────────────
// The avatar's vertical CENTER sits exactly on the card's bottom edge:
//   avatar wrapper -> absolute, top-full (= card's bottom line) + -translate-y-1/2
const CARD_W = 96;   // card width (px)
const CARD_H = 122;  // card height (px) — slightly taller than wide
const AVA    = 40;   // avatar wrapper width/height (px), incl. ring padding

export function StoryBar() {
  const { user, profile }               = useAuthStore();
  const { groups, loading, error, markViewed } = useStories();
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
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">

          {/* ── Your Story / Add Story ── */}
          {/* BUG FIX: previously the user's own group was filtered out of the
              list entirely (return null), so a just-published story never
              appeared anywhere — only the generic "+" button stayed visible.
              Now: if the user has an active story, its latest cover shows
              here and tapping it opens the viewer; the "+" badge always
              opens the picker to add another. */}
          {(() => {
            const myIdx   = groups.findIndex((g) => g.authorId === user?.uid);
            const myGroup = myIdx >= 0 ? groups[myIdx] : null;
            const myCover = myGroup?.stories[myGroup.stories.length - 1]?.mediaUrl;

            return (
              <div className="flex-shrink-0 flex flex-col items-center select-none" style={{ width: CARD_W }}>
                <div className="relative" style={{ width: CARD_W }}>
                  {/* Square card */}
                  <button
                    onClick={() => {
                      if (myGroup) { setViewerGroup(myIdx); setViewerOpen(true); }
                      else fileRef.current?.click();
                    }}
                    className={cn(
                      "block w-full rounded-2xl overflow-hidden relative bg-gray-100 dark:bg-gray-800",
                      myGroup ? "ring-2 ring-primary-500" : "ring-1 ring-gray-200 dark:ring-gray-700"
                    )}
                    style={{ height: CARD_H }}
                  >
                    {myCover ? (
                      <Image src={myCover} alt="" fill className="object-cover" />
                    ) : profile.photoURL ? (
                      <Image src={profile.photoURL} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center
                                      bg-gradient-to-br from-primary-100 to-primary-200
                                      dark:from-gray-700 dark:to-gray-800" />
                    )}
                    <div className="absolute inset-0 bg-black/15" />
                  </button>

                  {/* "+" badge — always opens the picker to add a new story */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={createStory.isPending}
                    className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-10
                               rounded-full p-[2px] bg-white dark:bg-gray-900 shadow"
                    style={{ width: AVA, height: AVA }}
                  >
                    <div className="w-full h-full rounded-full bg-primary-600
                                    flex items-center justify-center overflow-hidden">
                      {createStory.isPending
                        ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                        : <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                      }
                    </div>
                  </button>
                </div>

                {/* Label */}
                <span
                  className="mt-6 text-[11px] font-medium text-gray-700 dark:text-gray-300
                             text-center leading-tight truncate"
                  style={{ width: CARD_W }}
                >
                  {myGroup ? "আমার স্টোরি" : "স্টোরি যোগ করুন"}
                </span>
              </div>
            );
          })()}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFile}
          />

          {/* ── Loading skeletons ── */}
          {loading && !error && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{ width: CARD_W }}>
              <div
                className="rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
                style={{ width: CARD_W, height: CARD_H }}
              />
              <div className="w-12 h-2.5 mt-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ))}

          {/* ── Story cards ── */}
          {!loading && !error && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;
            const hasNew  = group.hasUnviewed;
            const cover   = group.stories[group.stories.length - 1]?.mediaUrl;

            return (
              <button
                key={group.authorId}
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
                className="flex-shrink-0 flex flex-col items-center select-none"
                style={{ width: CARD_W }}
              >
                <div className="relative" style={{ width: CARD_W }}>
                  {/* Square card — latest story preview */}
                  <div
                    className={cn(
                      "rounded-2xl overflow-hidden relative bg-gray-200 dark:bg-gray-700",
                      hasNew
                        ? "ring-2 ring-primary-500"
                        : "ring-1 ring-gray-200 dark:ring-gray-700"
                    )}
                    style={{ width: CARD_W, height: CARD_H }}
                  >
                    {cover ? (
                      <Image src={cover} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center
                                      bg-gradient-to-br from-purple-400 to-pink-500
                                      text-white font-bold text-2xl">
                        {group.authorName?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/15" />
                  </div>

                  {/* Avatar — center point sits on the card's bottom edge */}
                  <div
                    className={cn(
                      "absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-10",
                      "rounded-full p-[2px]",
                      hasNew
                        ? "bg-gradient-to-tr from-primary-500 via-purple-500 to-pink-500"
                        : "bg-white dark:bg-gray-900"
                    )}
                    style={{ width: AVA, height: AVA }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden
                                    bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900">
                      {group.authorPhoto ? (
                        <Image
                          src={group.authorPhoto}
                          alt={group.authorName}
                          width={AVA} height={AVA}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center
                                        bg-gradient-to-br from-purple-400 to-pink-500
                                        text-white font-bold text-sm">
                          {group.authorName?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <span
                  className="mt-6 text-[11px] font-medium text-gray-700 dark:text-gray-300
                             text-center leading-tight truncate"
                  style={{ width: CARD_W }}
                >
                  {group.authorName.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-2 rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2">
            <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mb-1">
              Stories লোড করা যায়নি — নিচের error থেকে কারণ দেখুন
              (যদি একটা link থাকে, সেটাতে গিয়ে index তৈরি করুন):
            </p>
            <p className="text-[11px] text-red-500 break-all select-all font-mono">
              {error}
            </p>
          </div>
        )}
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
