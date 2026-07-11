"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Database } from "./types";

export type AppSupabaseClient = SupabaseClient<Database>;

const SupabaseContext = createContext<AppSupabaseClient | null>(null);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  });
}

export interface SupabaseProviderProps {
  client: AppSupabaseClient;
  queryClient?: QueryClient;
  children: ReactNode;
}

export function SupabaseProvider({
  client,
  queryClient,
  children,
}: SupabaseProviderProps) {
  const [qc] = useState(() => queryClient ?? createQueryClient());
  return (
    <SupabaseContext.Provider value={client}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): AppSupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("useSupabase must be used within a <SupabaseProvider>");
  }
  return client;
}
