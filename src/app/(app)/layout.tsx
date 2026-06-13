import { Navbar }    from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top navbar */}
      <Navbar />

      {/* Page content — padded bottom so bottom nav never overlaps */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
