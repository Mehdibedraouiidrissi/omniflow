// ============================================================================
// Omniflow - @omniflow/config
// Centralised environment configuration loader with type safety
// ============================================================================

// ----------------------------------------------------------------------------
// Config interface
// ----------------------------------------------------------------------------

export interface AppConfig {
  app: {
    name: string;
    env: 'development' | 'test' | 'production';
    port: number;
    url: string;
    apiUrl: string;
    adminUrl: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    encryptionKey: string;
  };

  database: {
    url: string;
    /** Connection pool — max connections per service instance */
    poolMax: number;
  };

  redis: {
    url: string;
    /** Key namespace prefix to isolate environments */
    keyPrefix: string;
  };

  auth: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    /** Access token TTL in seconds */
    accessTokenTtl: number;
    /** Refresh token TTL in seconds */
    refreshTokenTtl: number;
    /** Whether to trust the X-Forwarded-For header */
    trustProxy: boolean;
  };

  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    /** Stripe API version */
    apiVersion: string;
  };

  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
    /** Pre-signed URL expiry in seconds */
    s3PresignedUrlTtl: number;
  };

  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    /** Twilio Messaging Service SID (optional) */
    messagingServiceSid?: string;
  };

  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromAddress: string;
    fromName: string;
  };

  storage: {
    /** 'local' for development, 's3' for production */
    driver: 'local' | 's3';
    localPath: string;
    /** Public base URL for stored assets */
    publicUrl: string;
  };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function env(key: string, defaultValue = ''): string {
  return process.env[key] ?? defaultValue;
}

function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function envBool(key: string, defaultValue = false): boolean {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.toLowerCase() === 'true' || raw === '1';
}

// ----------------------------------------------------------------------------
// Config loader
// ----------------------------------------------------------------------------

let _config: AppConfig | null = null;

/**
 * Return the application configuration singleton.
 * Reads from process.env on first call and caches the result.
 * Throws during validation if required variables are missing.
 */
export function getConfig(): AppConfig {
  if (_config) return _config;

  const nodeEnv = env('NODE_ENV', 'development') as AppConfig['app']['env'];
  const validEnvs = ['development', 'test', 'production'] as const;
  const appEnv = validEnvs.includes(nodeEnv) ? nodeEnv : 'development';

  _config = {
    app: {
      name: env('APP_NAME', 'Omniflow'),
      env: appEnv,
      port: envInt('PORT', 3000),
      url: env('APP_URL', 'http://localhost:3000'),
      apiUrl: env('API_URL', 'http://localhost:3001'),
      adminUrl: env('ADMIN_URL', 'http://localhost:3002'),
      logLevel: (env('LOG_LEVEL', 'info') as AppConfig['app']['logLevel']),
      encryptionKey: env('ENCRYPTION_KEY', ''),
    },

    database: {
      url: env('DATABASE_URL', ''),
      poolMax: envInt('DATABASE_POOL_MAX', 10),
    },

    redis: {
      url: env('REDIS_URL', 'redis://localhost:6379'),
      keyPrefix: env('REDIS_KEY_PREFIX', 'omniflow:'),
    },

    auth: {
      jwtSecret: env('JWT_SECRET', ''),
      jwtRefreshSecret: env('JWT_REFRESH_SECRET', ''),
      accessTokenTtl: envInt('JWT_ACCESS_TTL', 15 * 60),
      refreshTokenTtl: envInt('JWT_REFRESH_TTL', 30 * 24 * 60 * 60),
      trustProxy: envBool('TRUST_PROXY', false),
    },

    stripe: {
      secretKey: env('STRIPE_SECRET_KEY', ''),
      publishableKey: env('STRIPE_PUBLISHABLE_KEY', ''),
      webhookSecret: env('STRIPE_WEBHOOK_SECRET', ''),
      apiVersion: env('STRIPE_API_VERSION', '2024-06-20'),
    },

    aws: {
      accessKeyId: env('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: env('AWS_SECRET_ACCESS_KEY', ''),
      region: env('AWS_REGION', 'us-east-1'),
      s3Bucket: env('AWS_S3_BUCKET', ''),
      s3PresignedUrlTtl: envInt('AWS_S3_PRESIGNED_TTL', 3600),
    },

    twilio: {
      accountSid: env('TWILIO_ACCOUNT_SID', ''),
      authToken: env('TWILIO_AUTH_TOKEN', ''),
      phoneNumber: env('TWILIO_PHONE_NUMBER', ''),
      messagingServiceSid: process.env['TWILIO_MESSAGING_SERVICE_SID'],
    },

    email: {
      host: env('SMTP_HOST', 'localhost'),
      port: envInt('SMTP_PORT', 587),
      secure: envBool('SMTP_SECURE', false),
      user: env('SMTP_USER', ''),
      pass: env('SMTP_PASS', ''),
      fromAddress: env('FROM_EMAIL', 'noreply@omniflow.app'),
      fromName: env('FROM_NAME', 'Omniflow'),
    },

    storage: {
      driver: (env('STORAGE_DRIVER', 'local') as AppConfig['storage']['driver']),
      localPath: env('STORAGE_LOCAL_PATH', './uploads'),
      publicUrl: env('STORAGE_PUBLIC_URL', 'http://localhost:3001/uploads'),
    },
  };

  return _config;
}

/**
 * Validate that all required environment variables are present.
 * Call once at application startup before handling any requests.
 * Throws with a descriptive message listing all missing variables.
 */
export function validateConfig(): void {
  const missing: string[] = [];

  const required: Array<{ key: string; description: string }> = [
    { key: 'DATABASE_URL', description: 'PostgreSQL connection string' },
    { key: 'REDIS_URL', description: 'Redis connection string' },
    { key: 'JWT_SECRET', description: 'JWT signing secret' },
    { key: 'JWT_REFRESH_SECRET', description: 'JWT refresh token signing secret' },
    { key: 'ENCRYPTION_KEY', description: '32-byte AES encryption key (hex)' },
  ];

  // Production-only requirements
  if (process.env['NODE_ENV'] === 'production') {
    required.push(
      { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
      { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signing secret' },
      { key: 'AWS_ACCESS_KEY_ID', description: 'AWS access key ID' },
      { key: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret access key' },
      { key: 'AWS_S3_BUCKET', description: 'AWS S3 bucket name' },
      { key: 'SMTP_HOST', description: 'SMTP server hostname' },
      { key: 'FROM_EMAIL', description: 'From email address' },
      { key: 'APP_URL', description: 'Public application URL' },
      { key: 'API_URL', description: 'Public API URL' },
    );
  }

  for (const { key } of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Application configuration error — missing required environment variables:\n  ${missing.join('\n  ')}\n\nCopy .env.example to .env and fill in the missing values.`,
    );
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  const logLevel = process.env['LOG_LEVEL'];
  if (logLevel && !validLogLevels.includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL "${logLevel}". Must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate encryption key length (must be 64 hex chars = 32 bytes)
  const encKey = process.env['ENCRYPTION_KEY'] ?? '';
  if (encKey && !/^[0-9a-fA-F]{64}$/.test(encKey)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }

  // Reset cached config so it picks up validated env
  _config = null;
}

/** Expose individual env helpers for simple consumers */
export { env, envInt, envBool, requireEnv };
