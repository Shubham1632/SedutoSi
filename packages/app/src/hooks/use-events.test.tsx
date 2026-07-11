// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import {
  createTestQueryClient,
  withSupabaseProvider,
} from "../test-utils/render";
import {
  useCreateEvent,
  useEvent,
  useEvents,
  useEventTicketsSold,
} from "./use-events";

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

const eventA = {
  id: "event-a",
  title: "Jazz Night",
  description: null,
  category: "music",
  location: "Piazza Duomo",
  image_url: null,
  starts_at: "2026-06-01T20:00:00.000Z",
  ends_at: null,
  price: null,
  capacity: null,
  created_by: null,
};

function useCreateEventReady() {
  const s = useSession();
  const create = useCreateEvent();
  return { ready: !s.isLoading && !!s.user, create };
}

describe("useEvents", () => {
  it("fetches only upcoming events, ordered by start time", async () => {
    const { client } = createFakeSupabase({
      tables: {
        events: (query) => {
          expect(query.filters.some((f) => f.method === "gte")).toBe(true);
          expect(query.filters.find((f) => f.method === "order")?.args).toEqual(
            ["starts_at"],
          );
          return { data: [eventA], error: null };
        },
      },
    });

    const { result } = renderHook(() => useEvents(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([eventA]);
  });
});

describe("useEvent", () => {
  it("renders instantly from the events list cache", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["events"], [eventA]);

    const { client } = createFakeSupabase({
      tables: { events: () => ({ data: eventA, error: null }) },
    });

    const { result } = renderHook(() => useEvent(eventA.id), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    expect(result.current.data).toEqual(eventA);
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it("falls back to a real fetch when nothing is cached", async () => {
    const { client } = createFakeSupabase({
      tables: {
        events: (query) => {
          expect(query.single).toBe("single");
          return { data: eventA, error: null };
        },
      },
    });

    const { result } = renderHook(() => useEvent(eventA.id), {
      wrapper: withSupabaseProvider(client),
    });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual(eventA));
  });
});

describe("useCreateEvent", () => {
  it("inserts with the signed-in user as organizer and invalidates the list", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        events: (query) => {
          expect(query.op).toBe("insert");
          expect(query.payload).toMatchObject({
            title: "Open Mic",
            created_by: USER_ID,
          });
          return {
            data: { ...eventA, id: "event-b", title: "Open Mic" },
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => useCreateEventReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.create.mutate({
      title: "Open Mic",
      category: "music",
      imageUrl: "https://x/img.jpg",
      startsAt: "2026-07-01T20:00:00.000Z",
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    expect(result.current.create.data?.title).toBe("Open Mic");
  });

  it("rejects when there is no signed-in user", async () => {
    const { client } = createFakeSupabase({ session: null, tables: {} });

    const { result } = renderHook(() => useCreateEvent(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      title: "Open Mic",
      category: "music",
      imageUrl: "https://x/img.jpg",
      startsAt: "2026-07-01T20:00:00.000Z",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not signed in");
  });
});

describe("useEventTicketsSold", () => {
  it("reads tickets sold via the security-definer rpc", async () => {
    const { client } = createFakeSupabase({
      rpc: {
        get_event_tickets_sold: (name, args) => {
          expect(args).toEqual({ p_event_id: "event-a" });
          return { data: 7, error: null };
        },
      },
    });

    const { result } = renderHook(() => useEventTicketsSold("event-a"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(7);
  });

  it("does not query when eventId is empty", () => {
    const { client } = createFakeSupabase({ rpc: {} });
    const { result } = renderHook(() => useEventTicketsSold(""), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
