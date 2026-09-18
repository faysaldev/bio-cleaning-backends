import "dotenv/config";
import Redis from "ioredis";

let redisUrl = (process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "").trim();

if (!redisUrl) {
  console.error("❌ No REDIS_URL or UPSTASH_REDIS_URL found in your .env file!");
  console.log("👉 Please set REDIS_URL=rediss://default:YOUR_PASSWORD@... in your .env file.");
  process.exit(1);
}

if (redisUrl.includes("upstash.io") && redisUrl.startsWith("redis://")) {
  redisUrl = redisUrl.replace(/^redis:\/\//, "rediss://");
}

// Mask password for display
const maskedUrl = redisUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`🔄 Attempting connection to: ${maskedUrl}`);

const isTls = redisUrl.startsWith("rediss://");
const client = new Redis(redisUrl, {
  connectTimeout: 8000,
  maxRetriesPerRequest: 2,
  lazyConnect: false,
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
});

try {
  const start = Date.now();
  const pong = await client.ping();
  const latency = Date.now() - start;

  if (pong === "PONG") {
    console.log(`✅ Redis PING successful (pong received in ${latency}ms)!`);

    // Verify Read/Write capability
    const testKey = "bio-cleaning:connection-test";
    await client.set(testKey, "working", "EX", 30);
    const value = await client.get(testKey);
    await client.del(testKey);

    if (value === "working") {
      console.log("✅ Read/Write test verified successfully.");
      console.log("🎉 Upstash Redis is ready and fully operational!");
    } else {
      console.warn("⚠️ Read test returned unexpected value:", value);
    }
  } else {
    console.warn("⚠️ Unexpected ping response:", pong);
  }
} catch (error) {
  console.error("❌ Redis connection test failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await client.quit();
  process.exit(0);
}
