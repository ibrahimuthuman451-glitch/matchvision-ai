import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function badRequest(message: string, code = "invalid_request"): HttpError {
  return new HttpError(400, code, message);
}

export function notFound(message = "Resource not found."): HttpError {
  return new HttpError(404, "not_found", message);
}

export function asString(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string") throw badRequest(`${field} is required.`);
  const trimmed = value.trim();
  if (!trimmed) throw badRequest(`${field} is required.`);
  if (trimmed.length > max) throw badRequest(`${field} must be ${max} characters or fewer.`);
  return trimmed;
}

export function asEmail(value: unknown): string {
  const email = asString(value, "Email address", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    throw badRequest("Enter a valid email address.", "invalid_email");
  }
  return email;
}
