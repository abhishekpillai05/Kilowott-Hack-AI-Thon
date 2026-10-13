import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { runMigrations } from './db';
import { seedDatabase } from './seed';

const dbPath = path.resolve(process.env.DB_PATH || './data/catalogpilot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('🗑  Removed existing database');
  } catch (err: any) {
    if (err.code === 'EBUSY') {
      console.log('⚠️  Database file is in use — clearing tables via SQL instead');
      const tempDb = new Database(dbPath);
      tempDb.pragma('foreign_keys = OFF');
      const tables = tempDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;
      for (const t of tables) {
        tempDb.prepare(`DROP TABLE IF EXISTS "${t.name}"`).run();
      }
      tempDb.close();
    } else {
      throw err;
    }
  }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
runMigrations(db);
seedDatabase(db);
db.close();
console.log('✅ Database reset with fresh demo data');
