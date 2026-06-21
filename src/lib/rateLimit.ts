// In-memory rate limiter with Lockout Escalation (Edge & Serverless compatible)
interface RateLimitState {
  count: number;
  resetTime: number;
  lockoutLevel: number;
}

const ipCache = new Map<string, RateLimitState>();

export function isRateLimited(ip: string, limit = 5, baseWindowMs = 60000): boolean {
  const now = Date.now();
  const cached = ipCache.get(ip);

  // Clean memory leak protection
  if (ipCache.size > 1000) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) {
        ipCache.delete(key);
      }
    }
  }

  if (!cached) {
    ipCache.set(ip, {
      count: 1,
      resetTime: now + baseWindowMs,
      lockoutLevel: 0,
    });
    return false;
  }

  // If the client is currently locked out
  if (now < cached.resetTime && cached.count > limit) {
    // Penalty: Extend lockout by 15 seconds for every request made during lockout
    cached.resetTime += 15000;
    cached.count += 1;
    ipCache.set(ip, cached);
    return true;
  }

  // If the window has expired
  if (now > cached.resetTime) {
    // Decay lockout level slowly by 1 if they were locked out, otherwise reset
    const wasLockedOut = cached.count > limit;
    const newLockoutLevel = wasLockedOut ? Math.max(0, cached.lockoutLevel - 1) : 0;
    
    ipCache.set(ip, {
      count: 1,
      resetTime: now + baseWindowMs,
      lockoutLevel: newLockoutLevel,
    });
    return false;
  }

  cached.count += 1;

  // If they just crossed the limit, escalate their lockout duration
  if (cached.count > limit) {
    cached.lockoutLevel += 1;
    // Escalated duration: baseWindowMs * 2^(lockoutLevel - 1). Cap maximum lockout at 1 hour (3600000ms)
    const multiplier = Math.pow(2, cached.lockoutLevel - 1);
    const escalatedWindow = Math.min(3600000, baseWindowMs * multiplier);
    cached.resetTime = now + escalatedWindow;
  }

  ipCache.set(ip, cached);
  return cached.count > limit;
}
