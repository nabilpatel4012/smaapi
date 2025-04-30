import { valkey } from "../db/db";
import { logger } from "../utils/logger";

/**
 * Cache utility functions for handling Redis operations
 */

/**
 * Set value in cache with custom TTL
 * @param key The cache key
 * @param value The value to store (will be JSON stringified)
 * @param ttlSeconds Time to live in seconds (default: 3600 = 1 hour)
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<boolean> {
  try {
    const stringValue = JSON.stringify(value);
    await valkey.set(key, stringValue, "EX", ttlSeconds);
    return true;
  } catch (error) {
    logger.error({ error, key }, "setCache: Failed to set cache");
    return false;
  }
}

/**
 * Get value from cache
 * @param key The cache key
 * @returns Promise<T | null> The cached value or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await valkey.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error({ error, key }, "getCache: Failed to get cache");
    return null;
  }
}

/**
 * Check if key exists in cache
 * @param key The cache key
 * @returns Promise<boolean> Whether the key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  try {
    return (await valkey.exists(key)) > 0;
  } catch (error) {
    logger.error({ error, key }, "hasCache: Failed to check cache");
    return false;
  }
}

/**
 * Delete specific key from cache
 * @param key The cache key to invalidate
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function invalidateCache(key: string): Promise<boolean> {
  try {
    await valkey.del(key);
    return true;
  } catch (error) {
    logger.error({ error, key }, "invalidateCache: Failed to invalidate cache");
    return false;
  }
}

/**
 * Delete multiple keys from cache
 * @param keys Array of cache keys to invalidate
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function invalidateMultipleCache(
  keys: string[]
): Promise<boolean> {
  try {
    if (keys.length === 0) return true;
    await valkey.del(...keys);
    return true;
  } catch (error) {
    logger.error(
      { error, keys },
      "invalidateMultipleCache: Failed to invalidate multiple cache keys"
    );
    return false;
  }
}

/**
 * Delete cache keys by pattern
 * @param pattern Pattern to match cache keys (e.g., "user:*")
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function invalidateCacheByPattern(
  pattern: string
): Promise<boolean> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await valkey.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await valkey.del(...keys);
      }
    } while (cursor !== "0");

    return true;
  } catch (error) {
    logger.error(
      { error, pattern },
      "invalidateCacheByPattern: Failed to invalidate cache by pattern"
    );
    return false;
  }
}

/**
 * Helper function to generate a standardized cache key
 * @param prefix The prefix for the key (e.g., 'user', 'project')
 * @param id The identifier
 * @returns Formatted cache key
 */
export function generateCacheKey(prefix: string, id: string | number): string {
  return `${prefix}:${id}`;
}

/**
 * Helper function to generate a standardized cache key for user data
 * @param userId The user ID
 * @param suffix Optional suffix to specify what user data (e.g., 'profile', 'settings')
 * @returns Formatted user cache key
 */
export function generateUserCacheKey(userId: number, suffix?: string): string {
  return suffix ? `user:${userId}:${suffix}` : `user:${userId}`;
}

/**
 * Helper function to generate a standardized cache key for project data
 * @param projectId The project ID
 * @param suffix Optional suffix to specify what project data (e.g., 'tables', 'members')
 * @returns Formatted project cache key
 */
export function generateProjectCacheKey(
  projectId: number,
  suffix?: string
): string {
  return suffix ? `project:${projectId}:${suffix}` : `project:${projectId}`;
}

/**
 * Wrapper function to get or set cache
 * Will try to get data from cache first, if not found, will execute the provided function,
 * store the result in cache, and return it
 *
 * @param key The cache key
 * @param fn The function to execute if cache is missed
 * @param ttlSeconds Time to live in seconds (default: 3600 = 1 hour)
 * @returns Promise<T> The cached data or the result of the provided function
 */
export async function getOrSetCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  try {
    // Try to get from cache first
    const cachedData = await getCache<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // If not in cache, execute the function
    const data = await fn();

    // Store in cache for future use
    await setCache(key, data, ttlSeconds);

    return data;
  } catch (error) {
    logger.error({ error, key }, "getOrSetCache: Failed to get or set cache");
    // If any error occurs during caching, just return the function result
    return fn();
  }
}
