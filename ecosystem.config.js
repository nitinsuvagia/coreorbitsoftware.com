module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'npm',
      args: 'run dev',
      cwd: './services/api-gateway',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'auth-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/auth-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        NOTIFICATION_SERVICE_URL: 'http://localhost:3008'
      },
      error_file: './logs/auth-service-error.log',
      out_file: './logs/auth-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'employee-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/employee-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
        MASTER_DATABASE_URL: 'postgresql://postgres:password@localhost:5432/oms_master'
      },
      error_file: './logs/employee-service-error.log',
      out_file: './logs/employee-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'attendance-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/attendance-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3003
      },
      error_file: './logs/attendance-service-error.log',
      out_file: './logs/attendance-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'project-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/project-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3004
      },
      error_file: './logs/project-service-error.log',
      out_file: './logs/project-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'task-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/task-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3005
      },
      error_file: './logs/task-service-error.log',
      out_file: './logs/task-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'billing-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/billing-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3006
      },
      error_file: './logs/billing-service-error.log',
      out_file: './logs/billing-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'document-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/document-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3007
      },
      error_file: './logs/document-service-error.log',
      out_file: './logs/document-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'notification-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/notification-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3008,
        PLATFORM_SMTP_HOST: 'smtp.gmail.com',
        PLATFORM_SMTP_PORT: '587',
        PLATFORM_SMTP_SECURE: 'false',
        PLATFORM_SMTP_USER: 'nitin@softqubes.com',
        PLATFORM_SMTP_PASS: 'kayt qwnh xzlo pvgd',
        PLATFORM_FROM_EMAIL: 'noreply@softqubes.com',
        PLATFORM_FROM_NAME: 'OMS Platform'
      },
      error_file: './logs/notification-service-error.log',
      out_file: './logs/notification-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'report-service',
      script: 'npm',
      args: 'run dev',
      cwd: './services/report-service',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist', '*.log', '.git'],
      watch_delay: 1000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3009
      },
      error_file: './logs/report-service-error.log',
      out_file: './logs/report-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    },
    {
      name: 'web-app',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/web-app-error.log',
      out_file: './logs/web-app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000
    }
  ]
};
