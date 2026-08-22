interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM || '10', 10);
const BUCKET_CAPACITY = RATE_LIMIT_RPM;
const REFILL_RATE_MS = 60000 / RATE_LIMIT_RPM; // ms per token

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(store.entries())) {
    if (now - entry.lastRefill > 120000) { // older than 2 mins
      store.delete(ip);
    }
  }
}, 300000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, {
      tokens: BUCKET_CAPACITY - 1,
      lastRefill: now
    });
    return { allowed: true };
  }

  // Refill tokens based on time passed
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = Math.floor(timePassed / REFILL_RATE_MS);

  if (tokensToAdd > 0) {
    entry.tokens = Math.min(BUCKET_CAPACITY, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens -= 1;
    return { allowed: true };
  }

  // Calculate retry after in seconds
  const retryAfterMs = REFILL_RATE_MS - (timePassed % REFILL_RATE_MS);
  return {
    allowed: false,
    retryAfter: Math.ceil(retryAfterMs / 1000)
  };
}