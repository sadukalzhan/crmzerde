import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Не задана обязательная переменная окружения: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',

  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  databaseProvider: process.env.DATABASE_PROVIDER ?? 'sqlite',

  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  // На Render origin берётся из RENDER_EXTERNAL_URL (фронт и API — один домен).
  clientUrl: process.env.CLIENT_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173',

  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? '',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
  },
};
