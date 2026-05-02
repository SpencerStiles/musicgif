import { redis } from "./redis";

// Fixed-window: 5 clip creates per IP per minute
export async function checkRateLimit(ip: string): Promise<boolean> {
  const r = await redis();
  const window = Math.floor(Date.now() / 60000);
  const key = `ratelimit:clip:${ip}:${window}`;
  const count = await r.incr(key);
  if (count === 1) await r.expire(key, 60);
  return count <= 5;
}
