import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title:       "UmmahNet",
  description: "Beautiful, Peaceful and Meaningful Social Experience",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Animated gradient background — always behind everything */}
        <div className="bg-animated" aria-hidden="true" />
        <div className="bg-orb-2"    aria-hidden="true" />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
