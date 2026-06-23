"use client";

import { useParams }           from "next/navigation";
import { useRef, useEffect }   from "react";
import Link                    from "next/link";
import { ArrowLeft, Loader2, PlusCircle } from "lucide-react";
import { PostCard }            from "@/components/feed/PostCard";
import { PostSkeleton }        from "@/components/feed/PostSkeleton";
import { useCircle }           from "@/hooks/useCircles";
import { useCircleFeed, useCircleMembership } from "@/hooks/useCircles";

export default function CircleFeedPage() {
  const { id }              = useParams<{ id: string }>();
  const { circle }          = useCircle(id);
  const { joined }          = useCircleMembership(id);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCircleFeed(id);

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

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="card flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/circles/${id}`}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs text-gray-500">Circle Posts</p>
            <h2 className="font-bold text-gray-100 text-base truncate">{circle?.name}</h2>
          </div>
        </div>

        {joined && (
          <Link
            href={`/create-post?circleId=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold
                       text-primary-300 transition-all active:scale-95"
            style={{ background: "rgba(124,58,237,0.15)" }}
          >
            <PlusCircle className="w-4 h-4" />
            পোস্ট
          </Link>
        )}
      </div>

      {/* Posts */}
      {isLoading && <><PostSkeleton /><PostSkeleton /></>}

      {!isLoading && allPosts.length === 0 && (
        <div className="card p-14 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="font-semibold text-gray-300">কোনো পোস্ট নেই</p>
          {joined && (
            <p className="text-sm text-gray-500 mt-1">প্রথম পোস্ট তৈরি করুন</p>
          )}
        </div>
      )}

      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
        </div>
      )}
    </div>
  );
}
