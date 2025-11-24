const memoryCache = new Map();
const { REDIS_URL } = process.env;

let redisClientPromise = null;

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
  const client = await getRedisClient();

  if (client) {
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch (err) {
      console.error('⚠️ Redis set failed:', err.message);
    }
  }

  memoryCache.set(key, {
    payload: value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return true;
}

module.exports = {
  getRedisClient,
  getJson,
  setJson,
};
