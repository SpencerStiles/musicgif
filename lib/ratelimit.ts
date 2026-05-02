import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// 5 clip creates per IP per minute
export const clipCreateRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: false,
  prefix: "ratelimit:clip",
});
