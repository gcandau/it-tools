/** Errors carrying an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 413 | 422 | 429 | 500,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, 'bad_request', message, details);
}

export function unprocessable(message: string, details?: unknown) {
  return new ApiError(422, 'unprocessable_input', message, details);
}

export function toErrorBody(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, details: error.details } },
    };
  }

  // Tool services throw plain Errors for invalid input (bad base64, malformed JSON, and so on).
  // Those are the caller's fault, not ours, so they map to 422 rather than 500.
  if (error instanceof Error) {
    return {
      status: 422 as const,
      body: { error: { code: 'unprocessable_input', message: error.message } },
    };
  }

  return {
    status: 500 as const,
    body: { error: { code: 'internal_error', message: 'Unexpected server error' } },
  };
}
