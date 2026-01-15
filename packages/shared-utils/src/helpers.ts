// ============================================
// ARRAY & OBJECT UTILITIES
// ============================================

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Group array by key with custom function
 */
export function groupByFn<T>(array: T[], fn: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = fn(item);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Create lookup map from array
 */
export function keyBy<T>(array: T[], key: keyof T): Record<string, T> {
  return array.reduce((result, item) => {
    result[String(item[key])] = item;
    return result;
  }, {} as Record<string, T>);
}

/**
 * Get unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Get unique values by key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Sort array by key
 */
export function sortBy<T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Sort array by multiple keys
 */
export function sortByMultiple<T>(
  array: T[],
  keys: { key: keyof T; order: 'asc' | 'desc' }[]
): T[] {
  return [...array].sort((a, b) => {
    for (const { key, order } of keys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested array
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.flat() as T[];
}

/**
 * Deep flatten nested array
 */
export function flattenDeep<T>(array: unknown[]): T[] {
  return array.flat(Infinity) as T[];
}

/**
 * Pick specific keys from object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };
  
  for (const source of sources) {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key as keyof T];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue as object, sourceValue as object);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Get nested property value
 */
export function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce((acc: any, part) => acc?.[part], obj);
}

/**
 * Set nested property value
 */
export function setNestedValue(obj: object, path: string, value: unknown): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  
  let current: any = obj;
  for (const part of parts) {
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[last] = value;
}

/**
 * Remove null and undefined values from object
 */
export function compact<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Compare two objects for equality
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Get difference between two objects
 */
export function getDiff<T extends object>(
  oldObj: T,
  newObj: T
): { added: Partial<T>; removed: Partial<T>; changed: Partial<T> } {
  const added: Partial<T> = {};
  const removed: Partial<T> = {};
  const changed: Partial<T> = {};
  
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  for (const key of allKeys) {
    const k = key as keyof T;
    if (!(k in oldObj)) {
      added[k] = newObj[k];
    } else if (!(k in newObj)) {
      removed[k] = oldObj[k];
    } else if (!isEqual(oldObj[k], newObj[k])) {
      changed[k] = newObj[k];
    }
  }
  
  return { added, removed, changed };
}
