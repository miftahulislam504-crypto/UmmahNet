"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

function AuthInit({ children }: { children: React.ReactNode }) {
  useAuth(); // starts Firebase auth listener
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInit>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "#1f2937",
              color: "#f9fafb",
              fontSize: "14px",
            },
          }}
        />
      </AuthInit>
    </QueryClientProvider>
  );
}
