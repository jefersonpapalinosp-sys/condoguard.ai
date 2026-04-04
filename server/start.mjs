import dotenv from 'dotenv';
import { startServer } from './index.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const dialectArg = (process.argv[2] || process.env.DB_DIALECT || 'mock').toLowerCase();
process.env.DB_DIALECT = dialectArg;

const { shutdown } = startServer();

async function handleShutdown() {
  await shutdown(true);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
