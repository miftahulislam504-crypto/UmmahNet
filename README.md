# Phase 8, 9, 10 — নতুন ও আপডেট হওয়া ফাইল

এই ফাইলগুলো আগের প্রজেক্টে (Phase 1-7) যোগ করুন।

---

## 📂 ফাইল কোথায় রাখবে

```
phase-8-9-10/
│
├── firestore.rules          → পুরনোটা replace করো
├── firestore.indexes.json   → পুরনোটা replace করো
├── storage.rules            → পুরনোটা replace করো
│
└── src/
    ├── services/
    │   ├── storyService.ts      → নতুন (Phase 8)
    │   ├── advancedService.ts   → নতুন (Phase 9)
    │   └── adminService.ts      → নতুন (Phase 10)
    │
    ├── hooks/
    │   └── useStories.ts        → নতুন (Phase 8)
    │
    ├── components/
    │   ├── stories/
    │   │   ├── StoryBar.tsx     → নতুন (Phase 8)
    │   │   └── StoryViewer.tsx  → নতুন (Phase 8)
    │   ├── feed/
    │   │   └── PostCard.tsx     → আপডেট (Phase 9 — save+report+hashtag)
    │   └── ui/
    │       └── ReportModal.tsx  → নতুন (Phase 9)
    │
    └── app/
        ├── (app)/
        │   ├── page.tsx         → আপডেট (Phase 8 — StoryBar যোগ)
        │   └── saved/
        │       └── page.tsx     → আপডেট (Phase 9 — real data)
        └── admin/
            ├── layout.tsx       → নতুন (Phase 10)
            ├── page.tsx         → নতুন (Phase 10)
            ├── users/page.tsx   → নতুন (Phase 10)
            ├── reports/page.tsx → নতুন (Phase 10)
            ├── posts/page.tsx   → নতুন (Phase 10)
            └── settings/page.tsx→ নতুন (Phase 10)
```

---

## ⚠️ গুরুত্বপূর্ণ

### Admin প্রথমবার সেটআপ
Firebase Console → Firestore → `admins` collection →
Document ID = তোমার Firebase UID
Field: `grantedBy: "self"`

এরপর `/admin` route কাজ করবে।

### Firestore Indexes
`firestore.indexes.json` দেখে নতুন index গুলো Firebase Console-এ তৈরি করো:
- stories (expiresAt + createdAt)
- savedPosts (userId + createdAt)
- reports (status + createdAt)
- posts hashtags (array-contains + visibility + createdAt)

### postService.ts আপডেট
`src/services/postService.ts`-এ এই দুটো লাইন যোগ করো:

import-এর নিচে:
```ts
import { parseHashtags } from "@/services/advancedService";
```

createPost ফাংশনে `const type = ...` লাইনের পরে:
```ts
const hashtags = parseHashtags(content);
```

এবং Firestore-এ save করার সময় `visibility` এর পরে:
```ts
hashtags,
```
