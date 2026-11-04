import { RateLimitError } from '@/lib/errors/app-error';

interface RateBucket {
  count: number;
  resetAt: number;
}

declare global {
  var _plantifyRateBuckets: Map<string, RateBucket> | undefined;
}

const buckets = globalThis._plantifyRateBuckets ?? new Map<string, RateBucket>();
globalThis._plantifyRateBuckets = buckets;

export function enforceRateLimit(
  key: string,
  maxRequests = 12,
  windowMs = 60_000
): void {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new RateLimitError();
  }

  current.count += 1;
}
