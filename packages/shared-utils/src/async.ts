// ============================================
// ASYNC & PROMISE UTILITIES
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      onRetry?.(lastError, attempt);

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Run promises in batches
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Run promises with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await processor(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Create a deferred promise
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Memoize async function
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    ttlMs?: number;
    keyFn?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { ttlMs = 0, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, { value: any; expiresAt: number }>();

  return (async (...args: Parameters<T>) => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached && (ttlMs === 0 || cached.expiresAt > Date.now())) {
      return cached.value;
    }

    const value = await fn(...args);
    cache.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : Infinity,
    });

    return value;
  }) as T;
}

/**
 * Circuit breaker for async functions
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    failureThreshold?: number;
    resetTimeout?: number;
    onOpen?: () => void;
    onClose?: () => void;
  } = {}
): T {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    onOpen,
    onClose,
  } = options;

  let failures = 0;
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  let nextAttempt = 0;

  return (async (...args: Parameters<T>) => {
    if (state === 'open') {
      if (Date.now() < nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      state = 'half-open';
    }

    try {
      const result = await fn(...args);
      
      if (state === 'half-open') {
        state = 'closed';
        failures = 0;
        onClose?.();
      }
      
      return result;
    } catch (error) {
      failures++;
      
      if (failures >= failureThreshold) {
        state = 'open';
        nextAttempt = Date.now() + resetTimeout;
        onOpen?.();
      }
      
      throw error;
    }
  }) as T;
}
