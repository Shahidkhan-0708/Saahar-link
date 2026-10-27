import { ZodError, type ZodTypeAny, type output } from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Zod error mapper (S0-BE01): every validation failure becomes a stable
 * 400 response with machine-readable issue paths.
 */
export class ValidationError extends Error {
  constructor(public readonly issues: ZodError["issues"]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

/** Parses with defaults applied — returns the OUTPUT type (non-optional defaults). */
export function validate<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
): output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

export function validateBody<S extends ZodTypeAny>(schema: S) {
  return async (req: FastifyRequest): Promise<output<S>> => {
    return validate(schema, req.body);
  };
}

export function validationErrorHandler(
  error: unknown,
  _reply: FastifyReply,
): { statusCode: number; error: string; issues?: unknown } {
  if (error instanceof ValidationError || error instanceof ZodError) {
    const issues = error instanceof ZodError ? error.issues : error.issues;
    return { statusCode: 400, error: "Validation failed", issues };
  }
  return { statusCode: 500, error: "Internal Server Error" };
}
