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
  fs.unlinkSync(dbPath);
  console.log('🗑  Removed existing database');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
runMigrations(db);
seedDatabase(db);
db.close();
console.log('✅ Database reset with fresh demo data');
