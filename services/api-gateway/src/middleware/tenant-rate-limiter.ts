/**
 * Tenant Rate Limiter
 * Per-tenant rate limiting using Redis
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TenantContextRequest } from '../middleware';

// Redis client for rate limiting
let redis: Redis | null = null;

// Rate limit tiers based on subscription plan
export const RATE_LIMIT_TIERS: Record<string, { requestsPerMinute: number; burstLimit: number }> = {
  free: { requestsPerMinute: 60, burstLimit: 10 },
  starter: { requestsPerMinute: 300, burstLimit: 50 },
  professional: { requestsPerMinute: 1000, burstLimit: 100 },
  enterprise: { requestsPerMinute: 5000, burstLimit: 500 },
  unlimited: { requestsPerMinute: Infinity, burstLimit: Infinity },
};

// Default tier for tenants without explicit plan
const DEFAULT_TIER = 'professional';

// Tenant plan cache (TTL: 5 minutes)
const tenantPlanCache = new Map<string, { plan: string; expiresAt: number }>();

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = config.redisUrl || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.error({ error: err }, 'Redis rate limiter connection error');
    });
  }
  return redis;
}

/**
 * Get tenant subscription plan (cached)
 */
async function getTenantPlan(tenantSlug: string): Promise<string> {
  const cached = tenantPlanCache.get(tenantSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }

  try {
    // Look up tenant subscription from master database
    const { getMasterPrisma } = require('../utils/database');
    const prisma = getMasterPrisma();

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    const plan = tenant?.subscription?.plan?.slug || DEFAULT_TIER;

    // Cache for 5 minutes
    tenantPlanCache.set(tenantSlug, {
      plan,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return plan;
  } catch (error) {
    logger.warn({ error, tenantSlug }, 'Failed to get tenant plan, using default');
    return DEFAULT_TIER;
  }
}

/**
 * Check rate limit for a tenant
 * Uses sliding window algorithm with Redis
 */
async function checkRateLimit(
  tenantSlug: string,
  requestIdentifier: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}> {
  const plan = await getTenantPlan(tenantSlug);
  const tier = RATE_LIMIT_TIERS[plan] || RATE_LIMIT_TIERS[DEFAULT_TIER];

  // Unlimited tier bypasses rate limiting
  if (tier.requestsPerMinute === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: Date.now() + 60000,
      limit: Infinity,
    };
  }

  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute sliding window
  const key = `ratelimit:${tenantSlug}:${requestIdentifier}`;

  try {
    // Use Redis transaction for atomic operations
    const multi = redis.multi();

    // Remove expired entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now.toString(), `${now}-${Math.random()}`);

    // Set expiry on the key (cleanup)
    multi.expire(key, 120); // 2 minutes

    const results = await multi.exec();

    if (!results) {
      // Redis error, allow request but log
      logger.warn({ tenantSlug }, 'Rate limit check failed, allowing request');
      return {
        allowed: true,
        remaining: tier.requestsPerMinute,
        resetAt: now + 60000,
        limit: tier.requestsPerMinute,
      };
    }

    const currentCount = (results[1]?.[1] as number) || 0;
    const allowed = currentCount < tier.requestsPerMinute;
    const remaining = Math.max(0, tier.requestsPerMinute - currentCount - 1);

    return {
      allowed,
      remaining,
      resetAt: now + 60000,
      limit: tier.requestsPerMinute,
    };
  } catch (error) {
    logger.error({ error, tenantSlug }, 'Rate limit check error');
    // On error, allow the request
    return {
      allowed: true,
      remaining: tier.requestsPerMinute,
      resetAt: now + 60000,
      limit: tier.requestsPerMinute,
    };
  }
}

/**
 * Tenant rate limiting middleware
 * Should be applied after tenant context middleware
 */
export function tenantRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tcReq = req as TenantContextRequest;

    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    // If no tenant context, use IP-based rate limiting (handled by global limiter)
    const tenantSlug = tcReq.tenantContext?.tenantSlug || tcReq.domainResolution?.tenantSlug;
    if (!tenantSlug) {
      return next();
    }

    // Use tenant slug + user ID (if authenticated) or IP as identifier
    const userId = tcReq.user?.id || req.ip || 'anonymous';
    const requestIdentifier = `${userId}`;

    try {
      const result = await checkRateLimit(tenantSlug, requestIdentifier);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
      res.setHeader('X-RateLimit-Tenant', tenantSlug);

      if (!result.allowed) {
        logger.warn(
          {
            tenantSlug,
            userId,
            path: req.path,
          },
          'Rate limit exceeded'
        );

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
            retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          },
        });
      }

      next();
    } catch (error) {
      // On error, allow request to proceed
      logger.error({ error }, 'Tenant rate limiter error');
      next();
    }
  };
}

/**
 * Burst protection for specific expensive endpoints
 */
export function burstProtection(costMultiplier = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tcReq = req as TenantContextRequest;

    const tenantSlug = tcReq.tenantContext?.tenantSlug || tcReq.domainResolution?.tenantSlug;
    if (!tenantSlug) {
      return next();
    }

    const plan = await getTenantPlan(tenantSlug);
    const tier = RATE_LIMIT_TIERS[plan] || RATE_LIMIT_TIERS[DEFAULT_TIER];

    if (tier.burstLimit === Infinity) {
      return next();
    }

    const redis = getRedisClient();
    const key = `burst:${tenantSlug}:${req.path}`;
    const now = Date.now();
    const windowMs = 1000; // 1 second window for burst

    try {
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, now - windowMs);
      multi.zcard(key);
      multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
      multi.expire(key, 2);

      const results = await multi.exec();
      const count = ((results?.[1]?.[1] as number) || 0) * costMultiplier;

      if (count >= tier.burstLimit) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'BURST_LIMIT_EXCEEDED',
            message: 'Too many requests in a short time. Please wait a moment.',
            retryAfter: 1,
          },
        });
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Burst protection error');
      next();
    }
  };
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRateLimiter() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
