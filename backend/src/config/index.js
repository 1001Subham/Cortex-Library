import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  bookStorageRoot: path.resolve(
    process.env.BOOK_STORAGE_ROOT || path.join(__dirname, '../../../storage')
  ),
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'cortex_library',
    user: process.env.POSTGRES_USER || 'cortex_user',
    password: process.env.POSTGRES_PASSWORD || '',
  },
};

export default config;
