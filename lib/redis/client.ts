import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisAvailable: boolean | null = null; // null 表示未初始化
let connectionPromise: Promise<void> | null = null;

/**
 * 获取 Redis 客户端（懒加载 + 容错）
 */
export function getRedisClient(): Redis | null {
  // 如果已知 Redis 不可用，直接返回 null
  if (redisAvailable === false) {
    return null;
  }

  // 如果已初始化且可用，直接返回
  if (redisClient && redisAvailable === true && redisClient.status === 'ready') {
    return redisClient;
  }

  // 初始化 Redis 客户端
  if (!redisClient) {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      // 如果没有配置 REDIS_URL，标记为不可用
      if (!redisUrl) {
        console.log('[Redis] ℹ️ REDIS_URL not configured, skipping Redis');
        redisAvailable = false;
        return null;
      }
      
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Redis] Max retries reached, marking as unavailable');
            redisAvailable = false;
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: false,  // 立即连接
        connectTimeout: 5000, // 5 秒超时
      });

      // 监听连接事件
      redisClient.on('ready', () => {
        redisAvailable = true;
      });

      redisClient.on('error', (err) => {
        redisAvailable = false;
      });

      redisClient.on('close', () => {
        redisAvailable = false;
      });

      // 不立即设置可用状态，等待连接事件
      return redisClient;
    } catch (error) {
      console.error('[Redis] Initialization failed:', error);
      redisAvailable = false;
      return null;
    }
  }

  return redisClient;
}

/**
 * 检查 Redis 是否可用
 */
export function isRedisAvailable(): boolean {
  return redisAvailable === true && redisClient !== null && redisClient.status === 'ready';
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

