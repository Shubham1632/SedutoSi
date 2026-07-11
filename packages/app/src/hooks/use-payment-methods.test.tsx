// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import { withSupabaseProvider } from "../test-utils/render";
import {
  useDeletePaymentMethod,
  usePaymentMethods,
} from "./use-payment-methods";

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

function usePaymentMethodsReady() {
  const s = useSession();
  const list = usePaymentMethods();
  const del = useDeletePaymentMethod();
  return { ready: !s.isLoading && !!s.user, list, del };
}

describe("usePaymentMethods", () => {
  it("fetches the signed-in user's saved cards, newest first", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        payment_methods: (query) => {
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "user_id",
            USER_ID,
          ]);
          expect(query.filters.find((f) => f.method === "order")?.args).toEqual(
            ["created_at", { ascending: false }],
          );
          return {
            data: [
              {
                id: "pm1",
                user_id: USER_ID,
                brand: "visa",
                last4: "4242",
                exp_month: 12,
                exp_year: 2030,
                is_default: true,
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => usePaymentMethods(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.last4).toBe("4242");
  });

  it("does not query when signed out", () => {
    const { client, calls } = createFakeSupabase({ session: null, tables: {} });
    const { result } = renderHook(() => usePaymentMethods(), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useDeletePaymentMethod", () => {
  it("deletes by id, scoped to the signed-in user", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        payment_methods: (query) => {
          expect(query.op).toBe("delete");
          expect(query.filters).toEqual([
            { method: "eq", args: ["id", "pm1"] },
            { method: "eq", args: ["user_id", USER_ID] },
          ]);
          return { data: null, error: null };
        },
      },
    });

    const { result } = renderHook(() => usePaymentMethodsReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.del.mutate({ id: "pm1" });
    await waitFor(() => expect(result.current.del.isSuccess).toBe(true));
  });

  it("surfaces the Supabase error", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        payment_methods: () => ({ data: null, error: new Error("nope") }),
      },
    });

    const { result } = renderHook(() => usePaymentMethodsReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.del.mutate({ id: "pm1" });
    await waitFor(() => expect(result.current.del.isError).toBe(true));
  });
});
