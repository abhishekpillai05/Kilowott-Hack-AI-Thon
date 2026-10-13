import { beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Use a temporary test database file for isolation
const testDbDir = path.resolve(__dirname, '../../data');
const testDbPath = path.resolve(testDbDir, 'test_catalogpilot.db');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = testDbPath;
process.env.DEMO_MODE = 'true';
process.env.LOG_LEVEL = 'error';

beforeAll(async () => {
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }

  const { initDatabase } = await import('../database/db');
  await initDatabase();
});

afterAll(async () => {
  const { closeDatabase } = await import('../database/db');
  await closeDatabase();
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }
});
