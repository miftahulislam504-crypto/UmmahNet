"use client";

import { UserPlus, UserCheck, UserMinus, UserX, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRelationStatus, useFriendActions } from "@/hooks/useFriends";
import { useState } from "react";

interface Props {
  theirUid: string;
  size?:    "sm" | "md";
}

export function FriendButton({ theirUid, size = "md" }: Props) {
  const { data: rel, isLoading } = useRelationStatus(theirUid);
  const actions                  = useFriendActions(theirUid);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading || !rel) {
    return (
      <Button variant="outline" size={size} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (rel.status === "self") return null;

  // Already friends → Unfriend option
  if (rel.status === "friends") {
    if (showConfirm) {
      return (
        <div className="flex gap-2">
          <Button
            variant="danger"
            size={size}
            loading={actions.remove.isPending}
            onClick={() => { actions.remove.mutate(); setShowConfirm(false); }}
          >
            <UserMinus className="w-4 h-4" />
            Yes, remove
          </Button>
          <Button variant="outline" size={size} onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
        </div>
      );
    }
    return (
      <Button variant="outline" size={size} onClick={() => setShowConfirm(true)}>
        <UserCheck className="w-4 h-4" />
        Friends
      </Button>
    );
  }

  // Sent request → cancel
  if (rel.status === "request_sent") {
    return (
      <Button
        variant="outline"
        size={size}
        loading={actions.cancel.isPending}
        onClick={() => actions.cancel.mutate(rel.requestId!)}
      >
        <Clock className="w-4 h-4" />
        Request sent
      </Button>
    );
  }

  // Received request → accept / reject
  if (rel.status === "request_received") {
    return (
      <div className="flex gap-2">
        <Button
          size={size}
          loading={actions.accept.isPending}
          onClick={() => actions.accept.mutate(rel.requestId!)}
        >
          <UserCheck className="w-4 h-4" />
          Accept
        </Button>
        <Button
          variant="outline"
          size={size}
          loading={actions.reject.isPending}
          onClick={() => actions.reject.mutate(rel.requestId!)}
        >
          <UserX className="w-4 h-4" />
          Decline
        </Button>
      </div>
    );
  }

  // No relation → send request
  return (
    <Button
      size={size}
      loading={actions.send.isPending}
      onClick={() => actions.send.mutate()}
    >
      <UserPlus className="w-4 h-4" />
      Add friend
    </Button>
  );
}
