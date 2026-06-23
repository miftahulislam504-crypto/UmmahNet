// ─── PHASE 13: Circle types ────────────────────────────────────────────────────
// Add these to your existing src/types/index.ts

import { Timestamp } from "firebase/firestore";

export type CircleCategory =
  | "engineering"
  | "quran"
  | "family"
  | "students"
  | "business"
  | "language"
  | "women"
  | "community"
  | "technology"
  | "health"
  | "other";

export interface Circle {
  id:           string;
  name:         string;
  description:  string;
  category:     CircleCategory;
  coverPhoto:   string;
  avatarPhoto:  string;
  ownerId:      string;
  ownerName:    string;
  membersCount: number;
  postsCount:   number;
  isPrivate:    boolean;         // private circles require approval
  tags:         string[];
  searchTokens: string[];
  activeNow:    number;          // rough online count (updated periodically)
  createdAt:    Timestamp;
}

export interface CircleMember {
  id:        string;             // circleId_userId
  circleId:  string;
  userId:    string;
  userName:  string;
  userPhoto: string;
  role:      "owner" | "moderator" | "member";
  joinedAt:  Timestamp;
}

export interface CircleJoinRequest {
  id:         string;
  circleId:   string;
  userId:     string;
  userName:   string;
  userPhoto:  string;
  status:     "pending" | "approved" | "rejected";
  createdAt:  Timestamp;
}

export type CircleMemberRole = CircleMember["role"];
