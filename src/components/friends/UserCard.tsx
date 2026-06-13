import Link from "next/link";
import { Avatar }       from "@/components/ui/Avatar";
import { FriendButton } from "@/components/friends/FriendButton";
import type { UserProfile } from "@/types";

interface Props {
  user:         UserProfile;
  mutualCount?: number;
  showButton?:  boolean;
}

export function UserCard({ user, mutualCount, showButton = true }: Props) {
  return (
    <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <Link href={`/profile/${user.uid}`} className="flex-shrink-0">
        <Avatar src={user.photoURL} name={user.displayName} size="lg" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.uid}`}>
          <p className="font-semibold text-gray-900 dark:text-white hover:underline truncate">
            {user.displayName}
          </p>
        </Link>
        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
        {mutualCount !== undefined && mutualCount > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {mutualCount}  mutual friends
          </p>
        )}
        {user.bio && (
          <p className="text-xs text-gray-500 mt-1 truncate">{user.bio}</p>
        )}
      </div>

      {showButton && (
        <div className="flex-shrink-0">
          <FriendButton theirUid={user.uid} size="sm" />
        </div>
      )}
    </div>
  );
}
