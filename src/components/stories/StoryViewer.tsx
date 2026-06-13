"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image  from "next/image";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn }           from "@/lib/utils";
import type { StoryGroup, Story } from "@/services/storyService";

interface Props {
  groups:       StoryGroup[];
  initialGroup: number;
  onClose:      () => void;
  onView:       (storyId: string) => void;
}

const DURATION = 5000; // ms per story

export function StoryViewer({ groups, initialGroup, onClose, onView }: Props) {
  const { user }                        = useAuthStore();
  const [groupIdx,  setGroupIdx]        = useState(initialGroup);
  const [storyIdx,  setStoryIdx]        = useState(0);
  const [progress,  setProgress]        = useState(0);
  const [paused,    setPaused]          = useState(false);
  const intervalRef                     = useRef<ReturnType<typeof setInterval>>();

  const group   = groups[groupIdx];
  const story   = group?.stories[storyIdx];
  const isOwner = story?.authorId === user?.uid;

  // Mark viewed
  useEffect(() => {
    if (story && user && !story.viewerIds.includes(user.uid)) {
      onView(story.id);
    }
  }, [story, user, onView]);

  // Auto-progress
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const step = 100 / (DURATION / 100);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { advance(); return 0; }
        return p + step;
      });
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [storyIdx, groupIdx, paused]);

  const advance = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [group, groups, storyIdx, groupIdx, onClose]);

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStoryIdx(groups[groupIdx - 1].stories.length - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white p-2 rounded-full bg-black/40 hover:bg-black/60"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Story card */}
      <div className="relative w-full max-w-sm h-full max-h-[90vh] flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author row */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-2 px-3 pt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white flex-shrink-0 bg-gray-400">
            {story.authorPhoto ? (
              <Image src={story.authorPhoto} alt="" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {story.authorName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow">{story.authorName}</p>
            <p className="text-white/70 text-xs">
              {Math.round((story.expiresAt.toDate().getTime() - Date.now()) / 3600000)}ঘণ্টা বাকি
            </p>
          </div>
          {isOwner && (
            <div className="ml-auto flex items-center gap-1 text-white/80 text-xs">
              <Eye className="w-3.5 h-3.5" />
              {story.viewerIds.length}
            </div>
          )}
        </div>

        {/* Media */}
        <div
          className="relative flex-1 bg-black"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.type === "video" ? (
            <video
              src={story.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <Image src={story.mediaUrl} alt="" fill className="object-contain" />
          )}

          {/* Tap zones */}
          <button
            onClick={goBack}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            aria-label="previous"
          />
          <button
            onClick={advance}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
            aria-label="next"
          />
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-6">
            <p className="text-white text-sm leading-relaxed">{story.caption}</p>
          </div>
        )}
      </div>

      {/* Prev / Next group arrows */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx((i) => i - 1); setStoryIdx(0); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={() => { setGroupIdx((i) => i + 1); setStoryIdx(0); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
