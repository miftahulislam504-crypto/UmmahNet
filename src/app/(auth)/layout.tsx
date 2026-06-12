import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950
                    flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">N</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UmmahNet</h1>
          <p className="text-xs text-gray-500">Connect with your community</p>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md card p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
}
