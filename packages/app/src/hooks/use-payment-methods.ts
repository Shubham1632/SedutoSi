"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

export interface PaymentMethod {
  id: string;
  user_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

export function usePaymentMethods() {
  const supabase = useSupabase();
  const { user } = useSession();

  return useQuery({
    queryKey: ["payment-methods", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });
}

export function useDeletePaymentMethod() {
  const supabase = useSupabase();
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["payment-methods", user?.id],
      });
    },
  });
}
