import { Navbar }       from "@/components/layout/Navbar";
import { LeftSidebar }  from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Left */}
          <LeftSidebar />

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

          {/* Right */}
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
