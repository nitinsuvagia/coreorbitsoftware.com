// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName: string, originalError?: Error) {
    super(
      `External service '${serviceName}' failed`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { serviceName, originalError: originalError?.message }
    );
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500, {
      originalError: originalError?.message,
    });
  }
}

/**
 * Tenant not found error
 */
export class TenantNotFoundError extends AppError {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' not found`, 'TENANT_NOT_FOUND', 404, { tenantId });
  }
}

/**
 * Tenant suspended error
 */
export class TenantSuspendedError extends AppError {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' is suspended`, 'TENANT_SUSPENDED', 403, { tenantId });
  }
}

/**
 * Check if error is operational (expected)
 */
export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

/**
 * Wrap error for consistent handling
 */
export function wrapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: AppError): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
} {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

/**
 * Try-catch wrapper for async functions
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, wrapError(error)];
  }
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: boolean,
  message: string,
  ErrorClass: new (message: string) => AppError = ValidationError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert value exists or throw not found
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  id?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, id);
  }
}
