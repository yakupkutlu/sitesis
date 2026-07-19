import { env } from "./env.js";

function createRedisConnectionOptions(maxRetriesPerRequest: number | null) {
  const redisUrl = new URL(env.REDIS_URL);

  if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
    throw new Error("REDIS_URL redis:// veya rediss:// ile başlamalıdır.");
  }

  const databasePath = redisUrl.pathname.replace("/", "");
  const database = databasePath ? Number(databasePath) : 0;

  if (!Number.isInteger(database) || database < 0) {
    throw new Error("REDIS_URL içindeki veritabanı numarası geçersiz.");
  }

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username
      ? decodeURIComponent(redisUrl.username)
      : undefined,
    password: redisUrl.password
      ? decodeURIComponent(redisUrl.password)
      : undefined,
    db: database,
    maxRetriesPerRequest,
    enableOfflineQueue: maxRetriesPerRequest === null,
    ...(redisUrl.protocol === "rediss:"
      ? {
          tls: {},
        }
      : {}),
  };
}

// API isteklerinden kuyruğa iş ekleyen bağlantı hızlı hata vermelidir.
export const notificationQueueConnection =
  createRedisConnectionOptions(1);

// Worker, Redis geçici olarak kapanırsa yeniden bağlanmayı beklemelidir.
export const notificationWorkerConnection =
  createRedisConnectionOptions(null);
