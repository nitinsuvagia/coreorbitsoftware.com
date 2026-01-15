/**
 * Auth Service - Configuration
 */

// Helper to get env value at runtime (not at module load time)
const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

const getEnvInt = (key: string, defaultValue: number): number => {
  return parseInt(process.env[key] || String(defaultValue));
};

export interface AuthConfig {
  // Server
  port: number;
  host: string;
  nodeEnv: string;
  
  // Database
  masterDatabaseUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtAccessTokenExpiry: string | number;
  jwtRefreshTokenExpiry: string | number;
  jwtIssuer: string;
  
  // Password
  bcryptRounds: number;
  passwordMinLength: number;
  
  // MFA
  mfaIssuer: string;
  
  // Session
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  
  // Redis
  redisUrl: string;
  
  // Domain
  mainDomain: string;
  appUrl: string;
  
  // Logging
  logLevel: string;

  // Platform email (SMTP)
  platformEmail: {
    fromEmail: string;
    fromName: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPass?: string;
  };
  
  // Services
  notificationServiceUrl: string;
}

export const config: AuthConfig = {
  // Server
  get port() { return getEnvInt('AUTH_SERVICE_PORT', getEnvInt('PORT', 3001)); },
  get host() { return getEnv('HOST', '0.0.0.0'); },
  get nodeEnv() { return getEnv('NODE_ENV', 'development'); },
  
  // Database
  get masterDatabaseUrl() { return getEnv('MASTER_DATABASE_URL', 'postgresql://localhost:5432/oms_master'); },
  
  // JWT
  get jwtSecret() { return getEnv('JWT_SECRET', 'your-super-secret-jwt-key-min-32-characters-long'); },
  get jwtAccessTokenExpiry() { return getEnv('JWT_ACCESS_TOKEN_EXPIRY', '24h'); },
  get jwtRefreshTokenExpiry() { return getEnv('JWT_REFRESH_TOKEN_EXPIRY', '7d'); },
  get jwtIssuer() { return getEnv('JWT_ISSUER', 'oms-auth-service'); },
  
  // Password
  get bcryptRounds() { return getEnvInt('BCRYPT_ROUNDS', 12); },
  get passwordMinLength() { return getEnvInt('PASSWORD_MIN_LENGTH', 8); },
  
  // MFA
  get mfaIssuer() { return getEnv('MFA_ISSUER', 'Office Management System'); },
  
  // Session
  get sessionTimeout() { return getEnvInt('SESSION_TIMEOUT', 3600); }, // 1 hour
  get maxLoginAttempts() { return getEnvInt('MAX_LOGIN_ATTEMPTS', 5); },
  get lockoutDuration() { return getEnvInt('LOCKOUT_DURATION', 900); }, // 15 minutes
  
  // Redis
  get redisUrl() { return getEnv('REDIS_URL', 'redis://localhost:6379'); },
  
  // Domain
  get mainDomain() { return getEnv('MAIN_DOMAIN', 'youroms.com'); },
  get appUrl() { return getEnv('APP_URL', 'http://localhost:3000'); },
  
  // Logging
  get logLevel() { return getEnv('LOG_LEVEL', 'info'); },

  // Platform email (SMTP)
  get platformEmail() {
    return {
      fromEmail: getEnv('PLATFORM_EMAIL_FROM', 'itsupport@omsystem.com'),
      fromName: getEnv('PLATFORM_EMAIL_FROM_NAME', 'OMS Platform Support'),
      smtpHost: getEnv('PLATFORM_SMTP_HOST', 'localhost'),
      smtpPort: getEnvInt('PLATFORM_SMTP_PORT', 1025),
      smtpSecure: getEnv('PLATFORM_SMTP_SECURE', 'false') === 'true',
      smtpUser: getEnv('PLATFORM_SMTP_USER', ''),
      smtpPass: getEnv('PLATFORM_SMTP_PASS', ''),
    };
  },
  
  // Services
  get notificationServiceUrl() { 
    return getEnv('NOTIFICATION_SERVICE_URL', 'http://notification-service:3006'); 
  },
};

export default config;
