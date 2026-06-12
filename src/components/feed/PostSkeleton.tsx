export function PostSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="w-20 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="w-4/5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="w-3/5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="flex gap-2 mt-4">
        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
