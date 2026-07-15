// Daily rate limiting for plan-based message limits
// Tracks messages per user per day using in-memory store

interface DailyRecord {
  count: number;
  date: string; // YYYY-MM-DD
}

const dailyLimitMap = new Map<string, DailyRecord>();

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export interface DailyLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  resetTime: number; // Unix timestamp when day resets
}

export function checkDailyLimit(
  userId: string,
  maxMessages: number
): DailyLimitResult {
  const today = getTodayKey();
  const key = `daily:${userId}`;
  const record = dailyLimitMap.get(key);

  // Calculate reset time (midnight)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const resetTime = Math.floor(tomorrow.getTime() / 1000);

  // New day or no record
  if (!record || record.date !== today) {
    dailyLimitMap.set(key, { count: 1, date: today });
    return {
      allowed: true,
      remaining: maxMessages - 1,
      limit: maxMessages,
      used: 1,
      resetTime,
    };
  }

  // Check limit
  if (record.count >= maxMessages) {
    return {
      allowed: false,
      remaining: 0,
      limit: maxMessages,
      used: record.count,
      resetTime,
    };
  }

  // Increment counter
  record.count++;
  return {
    allowed: true,
    remaining: maxMessages - record.count,
    limit: maxMessages,
    used: record.count,
    resetTime,
  };
}

// Get current usage without incrementing
export function getDailyUsage(userId: string, maxMessages: number): DailyLimitResult {
  const today = getTodayKey();
  const key = `daily:${userId}`;
  const record = dailyLimitMap.get(key);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const resetTime = Math.floor(tomorrow.getTime() / 1000);

  if (!record || record.date !== today) {
    return {
      allowed: true,
      remaining: maxMessages,
      limit: maxMessages,
      used: 0,
      resetTime,
    };
  }

  return {
    allowed: record.count < maxMessages,
    remaining: Math.max(0, maxMessages - record.count),
    limit: maxMessages,
    used: record.count,
    resetTime,
  };
}

// Clean up old entries periodically (every hour)
setInterval(() => {
  const today = getTodayKey();
  for (const [key, value] of dailyLimitMap.entries()) {
    if (value.date !== today) {
      dailyLimitMap.delete(key);
    }
  }
}, 3600000);
