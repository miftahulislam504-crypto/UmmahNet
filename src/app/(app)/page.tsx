"use client";

import { useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { StoryBar }   from "@/components/stories/StoryBar";
import { PostCard }   from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { useFeed }    from "@/hooks/usePosts";
import { useHiddenUsers } from "@/hooks/useBlocks";
import { Button }     from "@/components/ui/Button";

export default function HomePage() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useFeed();
  const { hiddenIds } = useHiddenUsers();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = (data?.pages.flatMap((p) => p.posts) ?? [])
    // PHASE 6: hide posts from anyone with a block relationship (either direction).
    .filter((post) => !hiddenIds.has(post.authorId));

  return (
    <div className="flex flex-col gap-4">
      <StoryBar />

      {isLoading && <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>}

      {isError && (
        <div className="card p-10 text-center">
          <p className="text-gray-500 mb-3">Failed to load feed</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      )}

      {allPosts.map((post) => <PostCard key={post.id} post={post} />)}

      {!isLoading && !isError && allPosts.length === 0 && (
        <div className="card p-14 text-center">
          <p className="text-2xl mb-2">👥</p>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">কোনো পোস্ট নেই</h3>
          <p className="text-sm text-gray-500">
            ফ্রেন্ড যোগ করুন তাদের পোস্ট এখানে দেখতে পাবেন, অথবা নিজেই পোস্ট করুন।
          </p>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}
      {!hasNextPage && allPosts.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">You're all caught up</p>
      )}
    </div>
  );
}
