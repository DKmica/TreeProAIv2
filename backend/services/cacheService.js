const memoryCache = new Map();
const { REDIS_URL, MEMORY_CACHE_MAX_ITEMS, CACHE_DEFAULT_TTL_SECONDS } = process.env;

const MAX_ITEMS = Number.isFinite(Number(MEMORY_CACHE_MAX_ITEMS))
  ? Number(MEMORY_CACHE_MAX_ITEMS)
  : 500;
const DEFAULT_TTL_SECONDS = Number.isFinite(Number(CACHE_DEFAULT_TTL_SECONDS))
  ? Number(CACHE_DEFAULT_TTL_SECONDS)
  : 60;

let redisClientPromise = null;

function pruneMemoryCache() {
  const now = Date.now();

  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt < now) {
      memoryCache.delete(key);
    }
  }

  if (memoryCache.size <= MAX_ITEMS) {
    return;
  }

  const itemsToRemove = memoryCache.size - MAX_ITEMS;
  let removed = 0;

  // Remove the oldest entries first (Map preserves insertion order)
  for (const key of memoryCache.keys()) {
    memoryCache.delete(key);
    removed += 1;

    if (removed >= itemsToRemove) {
      break;
    }
  }
}

async function getRedisClient() {
  if (!REDIS_URL) {
    return null;
  }

  if (redisClientPromise) {
    return redisClientPromise;
  }

  redisClientPromise = import('redis')
    .then(({ createClient }) => {
      const client = createClient({ url: REDIS_URL });

      client.on('error', (err) => {
        console.error('⚠️ Redis client error:', err.message);
      });

      return client
        .connect()
        .then(() => {
          console.log('✅ Redis cache connected');
          return client;
        })
        .catch((err) => {
          console.error('❌ Failed to connect to Redis:', err.message);
          return null;
        });
    })
    .catch((err) => {
      console.error('⚠️ Redis module unavailable:', err.message);
      return null;
    });

  return redisClientPromise;
}

async function getJson(key) {
  pruneMemoryCache();

  const client = await getRedisClient();

  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('⚠️ Redis get failed:', err.message);
    }
  }

  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return cached.payload;
}

async function setJson(key, value, ttlSeconds = 60) {
  pruneMemoryCache();

  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;

  const client = await getRedisClient();

  if (client) {
    try {
      await client.set(key, JSON.stringify(value), { EX: ttl });
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch (err) {
      console.error('⚠️ Redis set failed:', err.message);
    }
  }

  memoryCache.set(key, {
    payload: value,
    expiresAt: Date.now() + ttl * 1000,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return true;
}

module.exports = {
  getRedisClient,
  getJson,
  setJson,
  pruneMemoryCache,
};
