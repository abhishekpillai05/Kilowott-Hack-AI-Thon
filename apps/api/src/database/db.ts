import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import { logger } from '../config/logger';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) throw new Error('Database not initialized — call initDatabase() first');
  return _db;
}

export async function initDatabase(): Promise<void> {
  const dbPath = path.resolve(config.DB_PATH);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -32000'); // 32 MB

  runMigrations(_db);
  logger.info('Database initialized', { path: dbPath });

  const { count } = _db.prepare('SELECT COUNT(*) as count FROM products').get() as {
    count: number;
  };
  if (count === 0) {
    const { seedDatabase } = await import('./seed');
    seedDatabase(_db);
    logger.info('Database seeded with demo data');
  } else {
    logger.info('Database has existing data', { products: count });
  }
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
    logger.info('Database connection closed');
  }
}

// ─── Schema migrations (versioned) ───────────────────────────────────────────

export function runMigrations(db: Database.Database): void {
  // Schema version tracking
  db.exec(`CREATE TABLE IF NOT EXISTS _schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const current = (
    db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM _schema_version').get() as { v: number }
  ).v;

  const migrations: Array<{ version: number; sql: string }> = [
    { version: 1, sql: MIGRATION_001 },
    { version: 2, sql: MIGRATION_002 },
  ];

  for (const m of migrations) {
    if (m.version > current) {
      logger.debug(`Running migration v${m.version}`);
      db.exec(m.sql);
      db.prepare('INSERT INTO _schema_version (version) VALUES (?)').run(m.version);
    }
  }
}

// ─── Migration 001 — core tables ─────────────────────────────────────────────
const MIGRATION_001 = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    wc_id INTEGER UNIQUE,
    sku TEXT,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT DEFAULT '',
    short_description TEXT DEFAULT '',
    price TEXT DEFAULT '',
    regular_price TEXT DEFAULT '',
    sale_price TEXT DEFAULT '',
    status TEXT DEFAULT 'publish',
    catalog_visibility TEXT DEFAULT 'visible',
    featured INTEGER DEFAULT 0,
    categories TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    attributes TEXT DEFAULT '[]',
    variations TEXT DEFAULT '[]',
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    stock_status TEXT DEFAULT 'instock',
    stock_quantity INTEGER,
    weight TEXT DEFAULT '',
    dimensions TEXT DEFAULT '{}',
    type TEXT DEFAULT 'simple',
    parent_id TEXT,
    health_score INTEGER DEFAULT 0,
    issues_count INTEGER DEFAULT 0,
    last_scanned_at TEXT,
    wc_synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    source TEXT DEFAULT 'demo'
  );

  CREATE TABLE IF NOT EXISTS catalog_issues (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT DEFAULT '{}',
    recommendation TEXT DEFAULT '',
    auto_fixable INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','ignored','wont_fix')),
    rule_id TEXT,
    detected_by TEXT DEFAULT 'catalog_doctor',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_proposals (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    issue_id TEXT,
    agent_run_id TEXT,
    field_name TEXT NOT NULL,
    current_value TEXT,
    proposed_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence TEXT DEFAULT '{}',
    confidence REAL DEFAULT 0.8,
    missing_evidence TEXT,
    warnings TEXT DEFAULT '[]',
    validation_status TEXT DEFAULT 'pending',
    validation_report TEXT DEFAULT '{}',
    approval_status TEXT DEFAULT 'pending',
    reviewer_id TEXT,
    reviewer_comment TEXT,
    approved_at TEXT,
    applied_at TEXT,
    apply_result TEXT DEFAULT '{}',
    verification_status TEXT DEFAULT 'pending',
    verification_report TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    product_id TEXT,
    product_ids TEXT DEFAULT '[]',
    input_data TEXT DEFAULT '{}',
    output_data TEXT DEFAULT '{}',
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    input_schema TEXT DEFAULT '{}',
    output_schema TEXT DEFAULT '{}',
    tool_calls TEXT DEFAULT '[]',
    handoff_to TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    model_provider TEXT,
    is_demo INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_comment TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    risk_level TEXT DEFAULT 'low',
    before_snapshot TEXT DEFAULT '{}',
    after_snapshot TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (proposal_id) REFERENCES ai_proposals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_jobs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    wc_id INTEGER,
    payload TEXT DEFAULT '{}',
    response TEXT DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    product_id TEXT,
    proposal_id TEXT,
    run_id TEXT,
    field_name TEXT,
    previous_value TEXT,
    new_value TEXT,
    approval_status TEXT,
    sync_result TEXT,
    verification_result TEXT,
    metadata TEXT DEFAULT '{}',
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS integration_configs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'woocommerce',
    site_url TEXT,
    status TEXT DEFAULT 'disconnected',
    last_tested_at TEXT,
    last_sync_at TEXT,
    product_count INTEGER DEFAULT 0,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  CREATE INDEX IF NOT EXISTS idx_products_health ON products(health_score);
  CREATE INDEX IF NOT EXISTS idx_issues_product ON catalog_issues(product_id);
  CREATE INDEX IF NOT EXISTS idx_issues_status ON catalog_issues(status);
  CREATE INDEX IF NOT EXISTS idx_issues_severity ON catalog_issues(severity);
  CREATE INDEX IF NOT EXISTS idx_proposals_product ON ai_proposals(product_id);
  CREATE INDEX IF NOT EXISTS idx_proposals_approval ON ai_proposals(approval_status);
  CREATE INDEX IF NOT EXISTS idx_agent_tasks_run ON agent_tasks(run_id);
  CREATE INDEX IF NOT EXISTS idx_audit_product ON audit_events(product_id);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
`;

// ─── Migration 002 — integration config seed ─────────────────────────────────
const MIGRATION_002 = `
  INSERT OR IGNORE INTO integration_configs (id, type, status)
  VALUES ('woocommerce', 'woocommerce', 'demo');
`;
