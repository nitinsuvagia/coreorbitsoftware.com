/**
 * Attendance Service Configuration
 */

export interface AttendanceServiceConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  host: string;
  port: number;
  
  // CORS
  corsOrigins: string | string[];
  
  // Database
  masterDatabaseUrl: string;
  
  // Redis
  redis: {
    url: string;
  };
  
  // AWS
  aws: {
    region: string;
  };
  
  // Work hours configuration
  workHours: {
    standardHoursPerDay: number;
    standardDaysPerWeek: number;
    workStartTime: string; // HH:mm format
    workEndTime: string;
    lunchBreakMinutes: number;
    graceMinutesLate: number;
    graceMinutesEarly: number;
  };
  
  // Overtime configuration
  overtime: {
    enabled: boolean;
    minMinutesForOvertime: number;
    maxOvertimeHoursPerDay: number;
    requiresApproval: boolean;
  };
  
  // Leave configuration
  leave: {
    maxCarryForwardDays: number;
    minAdvanceNoticeDays: number;
    allowHalfDay: boolean;
    allowNegativeBalance: boolean;
  };
  
  // Geolocation (optional)
  geolocation: {
    enabled: boolean;
    radiusMeters: number;
    officeLocations: Array<{ lat: number; lng: number; name: string }>;
  };
  
  // Pagination
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
}

export const config: AttendanceServiceConfig = {
  nodeEnv: (process.env.NODE_ENV || 'development') as AttendanceServiceConfig['nodeEnv'],
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3003', 10),
  
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || '*',
  
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
  
  workHours: {
    standardHoursPerDay: parseFloat(process.env.STANDARD_HOURS_PER_DAY || '8'),
    standardDaysPerWeek: parseInt(process.env.STANDARD_DAYS_PER_WEEK || '5', 10),
    workStartTime: process.env.WORK_START_TIME || '09:00',
    workEndTime: process.env.WORK_END_TIME || '18:00',
    lunchBreakMinutes: parseInt(process.env.LUNCH_BREAK_MINUTES || '60', 10),
    graceMinutesLate: parseInt(process.env.GRACE_MINUTES_LATE || '15', 10),
    graceMinutesEarly: parseInt(process.env.GRACE_MINUTES_EARLY || '15', 10),
  },
  
  overtime: {
    enabled: process.env.OVERTIME_ENABLED !== 'false',
    minMinutesForOvertime: parseInt(process.env.MIN_MINUTES_FOR_OVERTIME || '30', 10),
    maxOvertimeHoursPerDay: parseFloat(process.env.MAX_OVERTIME_HOURS_PER_DAY || '4'),
    requiresApproval: process.env.OVERTIME_REQUIRES_APPROVAL !== 'false',
  },
  
  leave: {
    maxCarryForwardDays: parseInt(process.env.MAX_CARRY_FORWARD_DAYS || '5', 10),
    minAdvanceNoticeDays: parseInt(process.env.MIN_ADVANCE_NOTICE_DAYS || '0', 10), // 0 = same-day/next-day leave allowed
    allowHalfDay: process.env.ALLOW_HALF_DAY !== 'false',
    allowNegativeBalance: process.env.ALLOW_NEGATIVE_BALANCE === 'true',
  },
  
  geolocation: {
    enabled: process.env.GEOLOCATION_ENABLED === 'true',
    radiusMeters: parseInt(process.env.GEOLOCATION_RADIUS_METERS || '100', 10),
    officeLocations: JSON.parse(process.env.OFFICE_LOCATIONS || '[]'),
  },
  
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
};
