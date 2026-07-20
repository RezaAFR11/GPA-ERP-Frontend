"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/lib/auth-context";
import { ToastContainer } from "@/components/ui/toast";

// Keep development diagnostics out of the production navigation bundle.
const ReactQueryDevtools = process.env.NODE_ENV === "development"
  ? dynamic(
      () => import("@tanstack/react-query-devtools").then((module) => module.ReactQueryDevtools),
      { ssr: false },
    )
  : () => null;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ToastContainer />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
