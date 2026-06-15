import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60)    return "এইমাত্র";
  if (diff < 3600)  return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;

  return date.toLocaleDateString("bn-BD", { month: "short", day: "numeric", year: "numeric" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Phase 4: Search token builder ───────────────────────────────────────────
// Splits displayName + username into all possible prefix tokens so that
// Firestore `array-contains` can match any word-level prefix.
// Works for both Bengali (Unicode word split) and English (Latin).
//
// Example:
//   displayName = "মিফতাহুল ইসলাম", username = "miftahul_islam"
//   → ["মিফতাহুল", "ইসলাম", "মিফ", "মিফত", "মিফতা", ...,
//      "miftahul", "islam", "mif", "mift", ...]
//
// We include both the full word AND every prefix of each word so that
// the user can match with partial input like "মিফ" or "isla".
export function buildSearchTokens(displayName: string, username: string): string[] {
  const tokenSet = new Set<string>();

  function addWordPrefixes(word: string) {
    const w = word.toLowerCase().trim();
    if (!w) return;
    // Add full word
    tokenSet.add(w);
    // Add every prefix ≥ 2 chars
    for (let i = 2; i < w.length; i++) {
      tokenSet.add(w.slice(0, i));
    }
  }

  // Split displayName on spaces and zero-width chars
  const nameWords = displayName
    .trim()
    .split(/[\s\u200B\u200C\u200D\uFEFF]+/)
    .filter(Boolean);
  nameWords.forEach(addWordPrefixes);

  // Split username on underscores, dots, hyphens, spaces
  const unameWords = username
    .trim()
    .split(/[\s_.\-]+/)
    .filter(Boolean);
  unameWords.forEach(addWordPrefixes);

  return Array.from(tokenSet);
}
