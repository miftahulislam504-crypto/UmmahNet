export function PostSkeleton() {
  return (
    <div className="card feed-item p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="skeleton h-3 w-32 rounded-full" />
          <div className="skeleton h-2 w-20 rounded-full" />
        </div>
      </div>
      {/* Content lines */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-4/5 rounded-full" />
        <div className="skeleton h-3 w-3/5 rounded-full" />
      </div>
      {/* Image placeholder */}
      <div className="skeleton w-full h-52 rounded-xl mb-4" />
      {/* Actions */}
      <div className="flex gap-2">
        <div className="skeleton h-8 w-24 rounded-xl" />
        <div className="skeleton h-8 w-28 rounded-xl" />
        <div className="skeleton h-8 w-10 rounded-xl" />
      </div>
    </div>
  );
}
