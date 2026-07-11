import type { AppSupabaseClient } from "@acme/api";

export interface FilterCall {
  method: string;
  args: unknown[];
}

export interface CapturedQuery {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  filters: FilterCall[];
  payload?: unknown;
  single: "none" | "single" | "maybeSingle";
}

export type TableHandler = (
  query: CapturedQuery,
) => { data: unknown; error: null } | { data: null; error: Error };

export type RpcHandler = (
  name: string,
  args: unknown,
) => { data: unknown; error: null } | { data: null; error: Error };

class FakeQueryBuilder implements PromiseLike<unknown> {
  private filters: FilterCall[] = [];
  private op: CapturedQuery["op"] = "select";
  private payload: unknown;
  private singleMode: CapturedQuery["single"] = "none";

  constructor(
    private readonly table: string,
    private readonly handler: TableHandler,
  ) {}

  select(...args: unknown[]) {
    this.filters.push({ method: "select", args });
    return this;
  }

  eq(...args: unknown[]) {
    this.filters.push({ method: "eq", args });
    return this;
  }

  neq(...args: unknown[]) {
    this.filters.push({ method: "neq", args });
    return this;
  }

  gte(...args: unknown[]) {
    this.filters.push({ method: "gte", args });
    return this;
  }

  lte(...args: unknown[]) {
    this.filters.push({ method: "lte", args });
    return this;
  }

  gt(...args: unknown[]) {
    this.filters.push({ method: "gt", args });
    return this;
  }

  lt(...args: unknown[]) {
    this.filters.push({ method: "lt", args });
    return this;
  }

  order(...args: unknown[]) {
    this.filters.push({ method: "order", args });
    return this;
  }

  limit(...args: unknown[]) {
    this.filters.push({ method: "limit", args });
    return this;
  }

  insert(payload: unknown) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private resolve() {
    return this.handler({
      table: this.table,
      op: this.op,
      filters: this.filters,
      payload: this.payload,
      single: this.singleMode,
    });
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export interface StorageBucketHandlers {
  upload?: AnyFn;
  getPublicUrl?: AnyFn;
}

export interface FakeSupabaseOptions {
  tables?: Record<string, TableHandler>;
  rpc?: Record<string, RpcHandler>;
  session?: { user: { id: string } } | null;
  auth?: Record<string, AnyFn>;
  storage?: Record<string, StorageBucketHandlers>;
  functions?: Record<string, AnyFn>;
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const calls: { table: string }[] = [];
  const session = options.session ?? null;

  const client = {
    from(table: string) {
      calls.push({ table });
      const handler = options.tables?.[table];
      if (!handler) {
        throw new Error(`fake-supabase: no handler registered for "${table}"`);
      }
      return new FakeQueryBuilder(table, handler);
    },
    rpc(name: string, args: unknown) {
      const handler = options.rpc?.[name];
      if (!handler) {
        throw new Error(
          `fake-supabase: no rpc handler registered for "${name}"`,
        );
      }
      return Promise.resolve(handler(name, args));
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
      ...options.auth,
    },
    storage: {
      from(bucket: string) {
        const handlers = options.storage?.[bucket];
        return {
          upload: (...args: unknown[]) =>
            Promise.resolve(
              (handlers?.upload ?? (() => ({ data: null, error: null })))(
                ...args,
              ),
            ),
          getPublicUrl: (
            ...args: unknown[]
          ): { data: { publicUrl: string } } =>
            handlers?.getPublicUrl
              ? (handlers.getPublicUrl(...args) as {
                  data: { publicUrl: string };
                })
              : { data: { publicUrl: "" } },
        };
      },
    },
    functions: {
      invoke: (name: string, ...args: unknown[]) => {
        const handler = options.functions?.[name];
        if (!handler) {
          throw new Error(
            `fake-supabase: no functions handler registered for "${name}"`,
          );
        }
        return Promise.resolve(handler(...args));
      },
    },
  };

  return {
    client: client as unknown as AppSupabaseClient,
    calls,
  };
}
