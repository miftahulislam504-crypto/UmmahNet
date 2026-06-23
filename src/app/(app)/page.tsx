"use client";

import { useEffect, useRef } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { StoryBar }    from "@/components/stories/StoryBar";
import { PostCard }    from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { useFeed }     from "@/hooks/usePosts";
import { useHiddenUsers } from "@/hooks/useBlocks";
import { Button }      from "@/components/ui/Button";

export default function HomePage() {
  const {
    data, isLoading, isError,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useFeed();
  const { hiddenIds } = useHiddenUsers();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = (data?.pages.flatMap((p) => p.posts) ?? [])
    .filter((post) => !hiddenIds.has(post.authorId));

  return (
    <div className="flex flex-col gap-3">
      {/* Stories */}
      <StoryBar />

      {/* Loading skeletons */}
      {isLoading && (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}

      {/* Error state */}
      {isError && (
        <div className="card p-10 text-center">
          <p className="text-gray-500 mb-3">ফিড লোড হয়নি</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> আবার চেষ্টা করুন
          </Button>
        </div>
      )}

      {/* Posts */}
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Empty feed */}
      {!isLoading && !isError && allPosts.length === 0 && (
        <div className="card p-14 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(124,58,237,0.15)" }}
          >
            <Sparkles className="w-7 h-7 text-primary-400" />
          </div>
          <h3 className="font-semibold text-gray-200 mb-1 text-lg">
            কোনো পোস্ট নেই
          </h3>
          <p className="text-sm text-gray-500">
            বন্ধু যোগ করুন তাদের পোস্ট এখানে দেখতে পাবেন,<br />
            অথবা নিজেই পোস্ট করুন।
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      )}

      {!hasNextPage && allPosts.length > 0 && (
        <p className="text-center text-xs text-gray-600 py-4 flex items-center justify-center gap-2">
          <span
            className="inline-block w-8 h-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          সব দেখা হয়ে গেছে
          <span
            className="inline-block w-8 h-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        </p>
      )}
    </div>
  );
}
