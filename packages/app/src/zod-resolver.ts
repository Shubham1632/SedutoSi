import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod/v4";

/**
 * A minimal react-hook-form resolver for zod schemas, written directly
 * against zod's `safeParseAsync` instead of going through
 * `@hookform/resolvers` — that package's `zodResolver`/`standardSchemaResolver`
 * exports have version-compatibility issues with this repo's zod/react-hook-form
 * versions (a type mismatch with `zodResolver`, and a runtime crash —
 * "path.split is not a function" — with `standardSchemaResolver`). Schemas here
 * are flat (no nested objects/arrays), so this only needs to map top-level
 * zod issues onto react-hook-form's flat error shape.
 */
export function zodFormResolver<T extends FieldValues>(
  schema: ZodType<T>,
): Resolver<T> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string" || key in errors) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (errors as any)[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors };
  };
}
