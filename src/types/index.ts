import { Timestamp } from "firebase/firestore";

// ─── User ─────────────────────────────────────────────────────────────────────
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
  searchTokens:   string[];
  createdAt:      Timestamp;
}

// ─── Post (Phase 12 expanded) ─────────────────────────────────────────────────
export type PostType =
  | "text"       // normal post
  | "image"      // with media
  | "video"
  | "poll"
  | "thread"     // Phase 12 NEW: X-style series
  | "question"   // Phase 12 NEW: community Q&A
  | "quote"      // Phase 12 NEW: motivational / share
  | "article";   // Phase 12 NEW: long-form (preview card in feed)

export interface Post {
  id:            string;
  authorId:      string;
  authorName:    string;
  authorPhoto:   string;
  content:       string;
  mediaUrls:     string[];

  // Phase 12: extended type
  type:          PostType;

  // Phase 12: Thread support — each thread post references its parent
  threadId?:     string;   // first post in a thread series
  threadIndex?:  number;   // 1-based position within thread

  // Phase 12: Poll data (inline)
  pollOptions?:  PollOption[];
  pollEndsAt?:   Timestamp;

  // Phase 12: Quote post
  quotedPostId?:    string;
  quotedContent?:   string;
  quotedAuthorName?: string;

  // Phase 12: Article fields (summary shown in feed card)
  articleTitle?:  string;
  articleCover?:  string;
  readingTime?:   number;   // minutes

  // Engagement (Phase 12: Like → Benefit)
  benefitsCount:  number;   // replaces likesCount
  likesCount:     number;   // kept for backward compat, mirrors benefitsCount
  commentsCount:  number;
  sharesCount:    number;

  visibility:    "public" | "friends" | "private";
  authorBanned?: boolean;
  createdAt:     Timestamp;
}

// Phase 12: Poll option
export interface PollOption {
  id:    string;
  text:  string;
  votes: number;
}

// Phase 12: Poll vote record
export interface PollVote {
  id:       string;
  postId:   string;
  userId:   string;
  optionId: string;
  createdAt: Timestamp;
}

// Phase 12: Benefit (replaces Like)
export interface Benefit {
  id:         string;
  targetId:   string;
  targetType: "post" | "comment";
  userId:     string;
  createdAt:  Timestamp;
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
  // Phase 12: comments renamed to Reflections in UI, but Firestore key stays
  isAcceptedAnswer?: boolean;  // for Question posts
  createdAt:       Timestamp;
}

// ─── Like (legacy — kept for Firestore compat, new code uses benefits) ────────
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
  unreadCounts: Record<string, number>;
}

// ─── UserPresence ─────────────────────────────────────────────────────────────
export interface UserPresence {
  online:   boolean;
  lastSeen: Timestamp | null;
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
  type:
    | "friend_request"
    | "friend_request_accepted"
    | "post_like"
    | "post_benefit"     // Phase 12
    | "post_comment"
    | "post_answer"      // Phase 12: accepted answer on a Question
    | "message";
  actorId:       string;
  actorName:     string;
  referenceId:   string;
  referenceType: string;
  read:          boolean;
  createdAt:     Timestamp;
}

// ─── Thread series ─────────────────────────────────────────────────────────────
// A thread is a group of Post documents all sharing the same `threadId`.
// threadIndex (1-based) defines display order.
export interface Thread {
  id:        string;           // same as the first post's id
  authorId:  string;
  postIds:   string[];         // ordered list of Post ids
  createdAt: Timestamp;
}
