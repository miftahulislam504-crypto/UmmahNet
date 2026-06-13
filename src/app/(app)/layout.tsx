import { Navbar }    from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* pb-20 ensures content never hidden behind BottomNav */}
      <main className="max-w-2xl mx-auto px-3 py-4 pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
