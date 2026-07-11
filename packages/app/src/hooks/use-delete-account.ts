"use client";

import { useMutation } from "@tanstack/react-query";

import { useSupabase } from "@acme/api";

export function useDeleteAccount() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;

      await supabase.auth.signOut();
    },
  });
}
