export const envConfig = () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'noreply@aurora.com',
  },
  otp: {
    ttl: parseInt(process.env.OTP_TTL || '300', 10),
    resendCooldown: parseInt(process.env.OTP_RESEND_COOLDOWN || '60', 10),
    maxRequests: parseInt(process.env.OTP_MAX_REQUESTS || '5', 10),
    window: parseInt(process.env.OTP_WINDOW || '3600', 10),
  },
  refresh: {
    ttl: parseInt(process.env.REFRESH_TTL || '604800', 10),
  },
  invitation: {
    ttl: parseInt(process.env.INVITATION_TTL || '604800', 10),
  },
  azure: {
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    container: process.env.AZURE_STORAGE_CONTAINER || 'attachments',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20 MB
  },
  port: parseInt(process.env.PORT || '3000', 10),
});
