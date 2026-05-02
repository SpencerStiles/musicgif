import { createClient } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: ReturnType<typeof createClient> | undefined;
}

function getClient() {
  if (!globalThis._redisClient) {
    globalThis._redisClient = createClient({ url: process.env.REDIS_URL });
    globalThis._redisClient.on("error", (err) =>
      console.error("Redis error:", err)
    );
  }
  return globalThis._redisClient;
}

export async function redis() {
  const client = getClient();
  if (!client.isOpen) await client.connect();
  return client;
}
