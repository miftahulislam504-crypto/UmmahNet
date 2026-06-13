"use client";

import Link from "next/link";
import { Avatar }       from "@/components/ui/Avatar";
import { Button }       from "@/components/ui/Button";
import { useFriendActions } from "@/hooks/useFriends";
import { formatDate }   from "@/lib/utils";
import type { UserProfile, FriendRequest } from "@/types";

interface Props {
  request: FriendRequest & { id: string; senderProfile: UserProfile | null };
}

export function PendingRequestCard({ request }: Props) {
  const { accept, reject } = useFriendActions(request.senderId);
  const sender             = request.senderProfile;

  if (!sender) return null;

  return (
    <div className="card p-4 flex items-start gap-3">
      <Link href={`/profile/${sender.uid}`} className="flex-shrink-0">
        <Avatar src={sender.photoURL} name={sender.displayName} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/profile/${sender.uid}`}>
          <p className="font-semibold text-sm text-gray-900 dark:text-white hover:underline">
            {sender.displayName}
          </p>
        </Link>
        <p className="text-xs text-gray-500">@{sender.username}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Sent you a friend request
        </p>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            loading={accept.isPending}
            onClick={() => accept.mutate(request.id)}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={reject.isPending}
            onClick={() => reject.mutate(request.id)}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
