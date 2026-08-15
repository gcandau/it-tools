import type { MiddlewareHandler } from 'hono';
import { ApiError } from './errors';

export interface ApiConfig {
  /** When empty, the API is open. When set, requests must carry a matching `X-API-Key`. */
  apiKeys: string[]
  /** Allowed CORS origins, or `*`. */
  corsOrigins: string[]
  rateLimit: { requests: number; windowMs: number }
  maxBodyBytes: number
}

export function readConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  const keys = (env.IT_TOOLS_API_KEYS ?? '')
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);

  const origins = (env.CORS_ORIGINS ?? '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  return {
    apiKeys: keys,
    corsOrigins: origins.length > 0 ? origins : ['*'],
    rateLimit: {
      requests: Number(env.RATE_LIMIT_REQUESTS ?? 60),
      windowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    },
    maxBodyBytes: Number(env.MAX_BODY_BYTES ?? 1_048_576),
  };
}

/** Length-independent comparison, so a wrong key cannot be found one character at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return difference === 0;
}

export function apiKeyAuth(config: ApiConfig): MiddlewareHandler {
  return async (context, next) => {
    if (config.apiKeys.length === 0) {
      return next();
    }

    const provided = context.req.header('x-api-key') ?? '';
    const accepted = config.apiKeys.some(key => timingSafeEqual(key, provided));

    if (!accepted) {
      throw new ApiError(401, 'unauthorized', 'A valid X-API-Key header is required.');
    }

    return next();
  };
}

interface Bucket { count: number; resetAt: number }

/**
 * Sliding-window rate limit held in memory.
 *
 * On Vercel this state is per-instance and dies with the instance, so it throttles bursts against a
 * single warm function rather than enforcing a global quota. That is a deliberate trade-off, not an
 * oversight: a hard quota needs shared storage. Point `RATE_LIMIT_REDIS_URL` at a store and swap
 * this implementation if you ever need one.
 */
export function createRateLimiter(config: ApiConfig) {
  const buckets = new Map<string, Bucket>();

  return {
    buckets,
    middleware: (): MiddlewareHandler => async (context, next) => {
      if (config.rateLimit.requests <= 0) {
        return next();
      }

      const key = context.req.header('x-api-key')
        ?? context.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        ?? 'anonymous';

      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + config.rateLimit.windowMs });
      }
      else if (bucket.count >= config.rateLimit.requests) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        context.header('Retry-After', String(retryAfter));
        throw new ApiError(429, 'rate_limited', `Rate limit exceeded. Retry in ${retryAfter}s.`);
      }
      else {
        bucket.count++;
      }

      // Opportunistic cleanup so the map cannot grow without bound on a long-lived instance.
      if (buckets.size > 10_000) {
        for (const [existingKey, existing] of buckets) {
          if (existing.resetAt <= now) {
            buckets.delete(existingKey);
          }
        }
      }

      return next();
    },
  };
}

export function bodyLimit(config: ApiConfig): MiddlewareHandler {
  return async (context, next) => {
    const declared = context.req.header('content-length');

    if (declared && Number(declared) > config.maxBodyBytes) {
      throw new ApiError(
        413,
        'payload_too_large',
        `Request body exceeds the ${config.maxBodyBytes} byte limit.`,
      );
    }

    return next();
  };
}
