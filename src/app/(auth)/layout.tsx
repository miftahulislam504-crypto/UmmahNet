import React from "react";
import Link  from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Use z-10 so content sits above the root-level bg-animated */
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Extra glow for auth pages */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
          filter:     "blur(60px)",
        }}
      />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8 group">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(124,58,237,0.4)", filter: "blur(12px)" }}
          />
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)" }}
          >
            <span className="text-white font-bold text-xl">U</span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">UmmahNet</h1>
          <p className="text-xs text-gray-500">Beautiful • Peaceful • Meaningful</p>
        </div>
      </Link>

      {/* Auth card */}
      <div className="card-elevated w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
