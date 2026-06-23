"use client";

import { useState, useRef } from "react";
import Image                 from "next/image";
import { Plus, Loader2 }    from "lucide-react";
import { StoryViewer }      from "@/components/stories/StoryViewer";
import { useStories, useCreateStory } from "@/hooks/useStories";
import { useAuthStore }     from "@/store/authStore";
import { cn }               from "@/lib/utils";

const CARD_W = 88;
const CARD_H = 116;
const AVA    = 36;

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
      {/* Glass story bar */}
      <div
        className="card px-3 py-3"
        style={{ borderRadius: "1.25rem" }}
      >
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">

          {/* My story */}
          {(() => {
            const myIdx   = groups.findIndex((g) => g.authorId === user?.uid);
            const myGroup = myIdx >= 0 ? groups[myIdx] : null;
            const myCover = myGroup?.stories[myGroup.stories.length - 1]?.mediaUrl;

            return (
              <div className="flex-shrink-0 flex flex-col items-center" style={{ width: CARD_W }}>
                <div className="relative" style={{ width: CARD_W }}>
                  {/* Card */}
                  <button
                    onClick={() => {
                      if (myGroup) { setViewerGroup(myIdx); setViewerOpen(true); }
                      else fileRef.current?.click();
                    }}
                    className="block w-full rounded-2xl overflow-hidden relative"
                    style={{
                      height:  CARD_H,
                      background: "rgba(124,58,237,0.12)",
                      border:  myGroup ? "2px solid #9f67fa" : "1px solid rgba(124,58,237,0.2)",
                    }}
                  >
                    {myCover ? (
                      <Image src={myCover} alt="" fill className="object-cover" />
                    ) : profile.photoURL ? (
                      <Image src={profile.photoURL} alt="" fill className="object-cover opacity-60" />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(159,103,250,0.2) 100%)" }}
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.15)" }} />
                  </button>

                  {/* Plus badge */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={createStory.isPending}
                    className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-10
                               rounded-full flex items-center justify-center"
                    style={{
                      width:      AVA,
                      height:     AVA,
                      background: "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)",
                      border:     "2px solid rgba(15,13,26,0.9)",
                      boxShadow:  "0 0 10px rgba(124,58,237,0.4)",
                    }}
                  >
                    {createStory.isPending
                      ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      : <Plus    className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    }
                  </button>
                </div>

                <span className="mt-5 text-[10px] font-medium text-gray-400 text-center truncate"
                  style={{ width: CARD_W }}>
                  {myGroup ? "আমার স্টোরি" : "যোগ করুন"}
                </span>
              </div>
            );
          })()}

          <input
            ref={fileRef} type="file" accept="image/*,video/*"
            className="hidden" onChange={handleFile}
          />

          {/* Loading */}
          {loading && !error && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{ width: CARD_W }}>
              <div className="skeleton rounded-2xl" style={{ width: CARD_W, height: CARD_H }} />
              <div className="skeleton h-2 w-10 mt-5 rounded-full" />
            </div>
          ))}

          {/* Story cards */}
          {!loading && !error && groups.map((group, idx) => {
            if (group.authorId === user?.uid) return null;
            const hasNew = group.hasUnviewed;
            const cover  = group.stories[group.stories.length - 1]?.mediaUrl;

            return (
              <button
                key={group.authorId}
                onClick={() => { setViewerGroup(idx); setViewerOpen(true); }}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ width: CARD_W }}
              >
                <div className="relative" style={{ width: CARD_W }}>
                  {/* Card */}
                  <div
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      width:    CARD_W,
                      height:   CARD_H,
                      background: "rgba(255,255,255,0.05)",
                      border:   hasNew
                        ? "2px solid #9f67fa"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {cover ? (
                      <Image src={cover} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #9f67fa)" }}>
                        <span className="text-white font-bold text-xl">
                          {group.authorName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.12)" }} />
                  </div>

                  {/* Avatar pill */}
                  <div
                    className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-10 rounded-full p-[2px]"
                    style={{
                      width:      AVA,
                      height:     AVA,
                      background: hasNew
                        ? "linear-gradient(135deg, #7c3aed, #9f67fa)"
                        : "rgba(15,13,26,0.9)",
                      boxShadow:  hasNew ? "0 0 10px rgba(124,58,237,0.5)" : "none",
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden"
                      style={{ border: "1.5px solid rgba(15,13,26,0.9)" }}>
                      {group.authorPhoto ? (
                        <Image src={group.authorPhoto} alt={group.authorName}
                          width={AVA} height={AVA} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #9f67fa)" }}>
                          <span className="text-white font-bold text-xs">
                            {group.authorName?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <span className="mt-5 text-[10px] font-medium text-gray-400 text-center truncate"
                  style={{ width: CARD_W }}>
                  {group.authorName.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-[11px] text-red-400 break-all font-mono">{error}</p>
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
