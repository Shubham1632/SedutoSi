"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { useSupabase } from "./provider";

export interface SessionState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

export function useSession(): SessionState {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return { session, user: session?.user ?? null, isLoading };
}
