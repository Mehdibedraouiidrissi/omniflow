// ============================================================================
// Omniflow Worker - Configuration from Environment Variables
// ============================================================================

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

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  logLevel: env('LOG_LEVEL', 'info'),

  // Health check
  healthPort: envInt('WORKER_HEALTH_PORT', 4001),

  // Database
  databaseUrl: env('DATABASE_URL', ''),

  // Redis
  redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
  redisHost: env('REDIS_HOST', 'localhost'),
  redisPort: envInt('REDIS_PORT', 6379),
  redisPassword: env('REDIS_PASSWORD', ''),

  // Email / SMTP (SES)
  smtpHost: env('SMTP_HOST', 'localhost'),
  smtpPort: envInt('SMTP_PORT', 587),
  smtpSecure: envBool('SMTP_SECURE', false),
  smtpUser: env('SMTP_USER', ''),
  smtpPass: env('SMTP_PASS', ''),
  emailFrom: env('FROM_EMAIL', 'noreply@omniflow.app'),
  emailFromName: env('FROM_NAME', 'Omniflow'),

  // AWS
  awsRegion: env('AWS_REGION', 'us-east-1'),
  awsAccessKeyId: env('AWS_ACCESS_KEY_ID', ''),
  awsSecretAccessKey: env('AWS_SECRET_ACCESS_KEY', ''),
  awsS3Bucket: env('AWS_S3_BUCKET', ''),

  // Twilio
  twilioAccountSid: env('TWILIO_ACCOUNT_SID', ''),
  twilioAuthToken: env('TWILIO_AUTH_TOKEN', ''),
  twilioPhoneNumber: env('TWILIO_PHONE_NUMBER', ''),
  twilioStatusCallbackUrl: env('TWILIO_STATUS_CALLBACK_URL', ''),

  // Stripe
  stripeSecretKey: env('STRIPE_SECRET_KEY', ''),

  // App URLs
  appUrl: env('APP_URL', 'http://localhost:3000'),
  apiUrl: env('API_URL', 'http://localhost:3001'),

  // Worker concurrency
  workerConcurrency: envInt('WORKER_CONCURRENCY', 5),
};

export type WorkerConfig = typeof config;
