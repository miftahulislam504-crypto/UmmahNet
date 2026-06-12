import { Timestamp } from "firebase/firestore";

// ─── User ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid:            string;
  username:       string;
  displayName:    string;
  email:          string;
  photoURL:       string;
  coverPhoto:     string;
  bio:            string;
  friendsCount:   number;
  postsCount:     number;
  isVerified:     boolean;
  isBlocked:      boolean;
  privacySetting: "public" | "friends" | "private";
  createdAt:      Timestamp;
}

// ─── Post ─────────────────────────────────────────────────────────────────────
export interface Post {
  id:            string;
  authorId:      string;
  authorName:    string;
  authorPhoto:   string;
  content:       string;
  mediaUrls:     string[];
  type:          "text" | "image" | "video" | "poll";
  likesCount:    number;
  commentsCount: number;
  sharesCount:   number;
  visibility:    "public" | "friends" | "private";
  createdAt:     Timestamp;
}

// ─── Comment ──────────────────────────────────────────────────────────────────
export interface Comment {
  id:              string;
  postId:          string;
  authorId:        string;
  authorName:      string;
  authorPhoto:     string;
  content:         string;
  likesCount:      number;
  parentCommentId: string | null;
  createdAt:       Timestamp;
}

// ─── Like ─────────────────────────────────────────────────────────────────────
export interface Like {
  id:         string;
  targetId:   string;
  targetType: "post" | "comment";
  userId:     string;
  createdAt:  Timestamp;
}

// ─── Friend Request ───────────────────────────────────────────────────────────
export interface FriendRequest {
  id:         string;
  senderId:   string;
  receiverId: string;
  status:     "pending" | "accepted" | "rejected";
  createdAt:  Timestamp;
}

// ─── Friendship ───────────────────────────────────────────────────────────────
export interface Friendship {
  id:        string;
  user1:     string;
  user2:     string;
  createdAt: Timestamp;
}

// ─── Conversation ─────────────────────────────────────────────────────────────
export interface Conversation {
  id:           string;
  participants: string[];
  type:         "private" | "group";
  lastMessage:  string;
  lastSenderId: string;
  updatedAt:    Timestamp;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface Message {
  id:             string;
  conversationId: string;
  senderId:       string;
  text:           string;
  mediaUrl:       string;
  type:           "text" | "image" | "voice";
  seen:           boolean;
  seenAt:         Timestamp | null;
  createdAt:      Timestamp;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id:            string;
  userId:        string;
  type:          "friend_request" | "post_like" | "post_comment" | "message";
  actorId:       string;
  actorName:     string;
  referenceId:   string;
  referenceType: string;
  read:          boolean;
  createdAt:     Timestamp;
}
