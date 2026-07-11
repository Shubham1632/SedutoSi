import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod/v4";

export function zodFormResolver<T extends FieldValues>(
  schema: ZodType<T>,
): Resolver<T> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: FieldErrors<T> = {};
    const errorsByKey = errors as Record<
      string,
      { type: string; message: string }
    >;
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string" || key in errors) continue;
      errorsByKey[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors };
  };
}
