import React from "react";
import { Navbar }       from "@/components/layout/Navbar";
import { BottomNav }    from "@/components/layout/BottomNav";
import { LeftSidebar }  from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    /* relative + z-10 so content sits above the fixed bg-animated */
    <div className="relative z-10 min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-3 pt-4 pb-24 flex gap-6">
        {/* Left sidebar — desktop only */}
        <LeftSidebar />

        {/* Main feed */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {children}
        </main>

        {/* Right sidebar — xl only */}
        <RightSidebar />
      </div>

      <BottomNav />
    </div>
  );
}
