import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend root directory .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  jwtSecret: process.env.JWT_SECRET || 'focusforge_default_dev_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/focusforge.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  bcryptSaltRounds: 10,
};

export default config;
