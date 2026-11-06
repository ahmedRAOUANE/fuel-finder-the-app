import { AppError } from "@/errors/base.error";

export type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const err = (code: string, message: string): ActionResult<never> => ({
    ok: false,
    error: { code, message },
});

export const catchToResult = <T>(error: unknown): ActionResult<T> => {
    if (error instanceof AppError) {
        return err(error.code, error.message);
    }
    console.error("action > uncaught", error);
    return err("UNKNOWN", "Something went wrong");
};

/**
 * Convert a service result to an ActionResult.
 *
 * `T` is the service return type; `U` is whatever the mapper produces.
 * This is what allows a service that returns a full `Station` row to be
 * serialized as a compact `{ publicId, status }` summary.
 *
 * Every current call site supplies a mapper. There is no no-mapper
 * variant — if the raw value is wanted, the caller uses `ok(value)`
 * directly on the success branch.
 */
export const serviceResult = <T, U>(
    result: T | AppError,
    wrap: (value: T) => ActionResult<U>,
): ActionResult<U> => {
    if (result instanceof AppError) {
        return err(result.code, result.message);
    }
    return wrap(result);
};