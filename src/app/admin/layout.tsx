"use client";

import { useEffect, useState } from "react";
import { useRouter }    from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { isAdmin }      from "@/services/adminService";
import Link             from "next/link";
import { cn }           from "@/lib/utils";
import {
  LayoutDashboard, Users, Flag, FileText,
  Settings, ShieldAlert, LogOut, Loader2,
} from "lucide-react";
import { logout } from "@/services/authService";
import toast      from "react-hot-toast";

const navItems = [
  { href: "/admin",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/users",    label: "Users", icon: Users           },
  { href: "/admin/reports",  label: "Reports",     icon: Flag            },
  { href: "/admin/posts",    label: "Posts",       icon: FileText        },
  { href: "/admin/settings", label: "Settings",      icon: Settings        },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router            = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    isAdmin(user.uid).then((ok) => {
      if (!ok) router.replace("/");
      else { setAllowed(true); setChecking(false); }
    });
  }, [user, loading, router]);

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    router.push("/login");
  }

  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">UmmahNet</p>
              <p className="text-xs text-red-600 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                       font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
