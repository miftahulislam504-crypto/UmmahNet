# UmmahNet

একটি সম্পূর্ণ Social Network Platform — Next.js 15 + Firebase

---

## Setup (প্রথমবার)

### ১. Firebase Config

`.env.local` ফাইলে Firebase-এর values বসান:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### ২. Firebase Console-এ চালু করুন

- Authentication → Sign-in methods → Email/Password ✅ এবং Google ✅
- Firestore Database → Create database (Production mode)
- Storage → Get started

### ৩. Firestore Rules & Indexes

- Firebase Console → Firestore → Rules → `firestore.rules` content paste করুন
- Firebase Console → Firestore → Indexes → `firestore.indexes.json` থেকে সব index তৈরি করুন

### ৪. Storage Rules

Firebase Console → Storage → Rules → `storage.rules` content paste করুন

### ৫. Vercel Deploy

Vercel-এ deploy করার সময় Environment Variables-এ `.env.local`-এর সব values যোগ করুন।

---

## Project Structure

```
src/
  app/
    (auth)/          → login, register
    (app)/           → main app (navbar + sidebars)
      page.tsx       → home feed
      profile/[uid]/ → user profile + posts
      friends/       → friend requests, list, find
      messages/      → realtime chat
      notifications/ → activity notifications
      search/        → global search
      settings/      → privacy, password
      saved/         → saved posts
  components/
    ui/              → Button, Input, Avatar
    layout/          → Navbar, LeftSidebar, RightSidebar
    feed/            → CreatePostBox, PostCard, CommentSection, PostSkeleton
    chat/            → ConversationList, ChatWindow
    friends/         → FriendButton, UserCard, PendingRequestCard, FindPeopleTab
    profile/         → EditProfileModal
  lib/
    firebase/        → Firebase config
    utils.ts         → helpers, formatDate, cn
  hooks/
    useAuth.ts       → auth state
    useFriends.ts    → friend operations
    usePosts.ts      → feed, create, like, comment
    useChat.ts       → messages, conversations
    useNotifications.ts → realtime notifications
  services/
    authService.ts         → login, register, logout
    friendService.ts       → send/accept/reject request, unfriend, search
    postService.ts         → create, delete, like, comment, feed
    chatService.ts         → conversations, messages, seen
    notificationService.ts → create, mark read, subscribe
  store/
    authStore.ts     → Zustand global state
  types/
    index.ts         → TypeScript interfaces
```

---

## Development Phases

| Phase | বিষয়বস্তু | Status |
|-------|-----------|--------|
| 1 | Foundation, Auth, Profile, Layout | ✅ Done |
| 2 | Friend System (send/accept/reject/search) | ✅ Done |
| 3 | Posts & Feed (create/like/comment/infinite scroll) | ✅ Done |
| 4 | Messenger (realtime chat, seen status, image) | ✅ Done |
| 5 | Notifications (realtime, mark read) | ✅ Done |
| 6 | Media System (avatar, cover, post images) | ✅ Done |
| 7 | Profile Enhancement (timeline, settings) | ✅ Done |
| 8 | Stories | 🔜 Next |
| 9 | Advanced (hashtags, save, report, follow) | 🔜 |
| 10 | Admin Panel | 🔜 |
