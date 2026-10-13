import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../middleware/errorHandler';
import { calculateHealthScore } from './healthScoring';
import type { Product } from '@catalogpilot/shared';

interface DbRow {
  [key: string]: unknown;
}

function parseProduct(row: DbRow): Product {
  return {
    ...row,
    featured: Boolean(row.featured),
    categories: safeJson(row.categories as string, []),
    tags: safeJson(row.tags as string, []),
    images: safeJson(row.images as string, []),
    attributes: safeJson(row.attributes as string, []),
    variations: safeJson(row.variations as string, []),
    dimensions: safeJson(row.dimensions as string, {}),
  } as unknown as Product;
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface ListProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  source?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  hasIssues?: boolean;
  minHealth?: number;
  maxHealth?: number;
}

export function listProducts(opts: ListProductsOptions = {}) {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    status,
    source,
    sort = 'name',
    order = 'asc',
    hasIssues,
    minHealth,
    maxHealth,
  } = opts;

  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (search) {
    conditions.push(`(p.name LIKE @search OR p.sku LIKE @search OR p.description LIKE @search)`);
    params.search = `%${search}%`;
  }
  if (status) {
    conditions.push(`p.status = @status`);
    params.status = status;
  }
  if (source) {
    conditions.push(`p.source = @source`);
    params.source = source;
  }
  if (hasIssues === true) {
    conditions.push(`p.issues_count > 0`);
  } else if (hasIssues === false) {
    conditions.push(`p.issues_count = 0`);
  }
  if (minHealth !== undefined) {
    conditions.push(`p.health_score >= @minHealth`);
    params.minHealth = minHealth;
  }
  if (maxHealth !== undefined) {
    conditions.push(`p.health_score <= @maxHealth`);
    params.maxHealth = maxHealth;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = [
    'name',
    'sku',
    'price',
    'health_score',
    'issues_count',
    'created_at',
    'updated_at',
  ];
  const sortCol = allowedSort.includes(sort) ? sort : 'name';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';
  const offset = (page - 1) * limit;

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(params) as { count: number }
  ).count;

  const rows = db
    .prepare(
      `SELECT p.* FROM products p ${where}
       ORDER BY p.${sortCol} ${sortDir}
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as DbRow[];

  return {
    data: rows.map(parseProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getProductById(id: string): Product {
  const db = getDb();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as DbRow | undefined;
  if (!row) throw new NotFoundError('Product', id);
  return parseProduct(row);
}

export function updateProduct(id: string, updates: Partial<Product>, actor = 'user'): Product {
  const db = getDb();
  const existing = getProductById(id);

  // Recalculate health score with updated values
  const merged = { ...existing, ...updates };
  const scoring = calculateHealthScore(merged);

  const row = db
    .prepare(
      `UPDATE products SET
        sku = @sku, name = @name, slug = @slug,
        description = @description, short_description = @short_description,
        price = @price, regular_price = @regular_price, sale_price = @sale_price,
        status = @status, categories = @categories, tags = @tags,
        images = @images, attributes = @attributes,
        meta_title = @meta_title, meta_description = @meta_description,
        stock_status = @stock_status, stock_quantity = @stock_quantity,
        weight = @weight, dimensions = @dimensions,
        health_score = @health_score,
        updated_at = datetime('now')
      WHERE id = @id
      RETURNING *`,
    )
    .get({
      id,
      sku: merged.sku ?? '',
      name: merged.name,
      slug: merged.slug ?? '',
      description: merged.description ?? '',
      short_description: merged.short_description ?? '',
      price: merged.price ?? '',
      regular_price: merged.regular_price ?? '',
      sale_price: merged.sale_price ?? '',
      status: merged.status ?? 'publish',
      categories: JSON.stringify(merged.categories ?? []),
      tags: JSON.stringify(merged.tags ?? []),
      images: JSON.stringify(merged.images ?? []),
      attributes: JSON.stringify(merged.attributes ?? []),
      meta_title: merged.meta_title ?? '',
      meta_description: merged.meta_description ?? '',
      stock_status: merged.stock_status ?? 'instock',
      stock_quantity: merged.stock_quantity ?? null,
      weight: merged.weight ?? '',
      dimensions: JSON.stringify(merged.dimensions ?? {}),
      health_score: scoring.total,
    }) as DbRow;

  // Emit audit event
  recordAuditEvent({
    event_type: 'product.updated',
    actor,
    product_id: id,
    metadata: { fields: Object.keys(updates) },
  });

  return parseProduct(row);
}

export function getProductIssues(productId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM catalog_issues WHERE product_id = ? ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
    )
    .all(productId);
}

export function getDashboardMetrics() {
  const db = getDb();

  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const avgHealth = (
    db.prepare('SELECT COALESCE(AVG(health_score), 0) as v FROM products').get() as { v: number }
  ).v;
  const productsNeedingAttention = (
    db.prepare('SELECT COUNT(*) as c FROM products WHERE issues_count > 0').get() as { c: number }
  ).c;
  const openIssues = (
    db.prepare("SELECT COUNT(*) as c FROM catalog_issues WHERE status = 'open'").get() as {
      c: number;
    }
  ).c;
  const criticalIssues = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM catalog_issues WHERE severity = 'critical' AND status = 'open'",
      )
      .get() as { c: number }
  ).c;
  const missingDescriptions = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM catalog_issues WHERE issue_type = 'description' AND status = 'open'",
      )
      .get() as { c: number }
  ).c;
  const missingImages = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM catalog_issues WHERE issue_type = 'media' AND status = 'open'",
      )
      .get() as { c: number }
  ).c;
  const duplicateCandidates = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM catalog_issues WHERE issue_type = 'duplicate' AND status = 'open'",
      )
      .get() as { c: number }
  ).c;
  const pendingProposals = (
    db
      .prepare("SELECT COUNT(*) as c FROM ai_proposals WHERE approval_status = 'pending'")
      .get() as { c: number }
  ).c;
  const pendingApprovals = (
    db.prepare("SELECT COUNT(*) as c FROM approvals WHERE status = 'pending'").get() as {
      c: number;
    }
  ).c;
  const appliedRepairs = (
    db
      .prepare("SELECT COUNT(*) as c FROM ai_proposals WHERE approval_status = 'applied'")
      .get() as { c: number }
  ).c;
  const failedRepairs = (
    db.prepare("SELECT COUNT(*) as c FROM ai_proposals WHERE approval_status = 'failed'").get() as {
      c: number;
    }
  ).c;

  const lastScan = db
    .prepare(
      "SELECT created_at FROM audit_events WHERE event_type LIKE 'catalog.scan%' ORDER BY created_at DESC LIMIT 1",
    )
    .get() as { created_at: string } | undefined;

  const integration = db
    .prepare('SELECT status FROM integration_configs WHERE id = ?')
    .get('woocommerce') as { status: string } | undefined;

  return {
    totalProducts,
    healthScore: Math.round(avgHealth),
    productsNeedingAttention,
    openIssues,
    criticalIssues,
    missingDescriptions,
    missingImages,
    duplicateCandidates,
    pendingProposals,
    pendingApprovals,
    appliedRepairs,
    failedRepairs,
    lastScanAt: lastScan?.created_at ?? null,
    integrationStatus: integration?.status ?? 'disconnected',
    isDemo: process.env.DEMO_MODE === 'true',
  };
}

export function recordAuditEvent(params: {
  event_type: string;
  actor: string;
  product_id?: string | null;
  proposal_id?: string | null;
  run_id?: string | null;
  field_name?: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  approval_status?: string | null;
  sync_result?: string | null;
  verification_result?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}): void {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO audit_events (
      id, event_type, actor, product_id, proposal_id, run_id, field_name,
      previous_value, new_value, approval_status, sync_result, verification_result,
      metadata, ip_address, created_at
    ) VALUES (
      @id, @event_type, @actor, @product_id, @proposal_id, @run_id, @field_name,
      @previous_value, @new_value, @approval_status, @sync_result, @verification_result,
      @metadata, @ip_address, datetime('now')
    )
  `,
  ).run({
    id: uuidv4(),
    event_type: params.event_type,
    actor: params.actor,
    product_id: params.product_id ?? null,
    proposal_id: params.proposal_id ?? null,
    run_id: params.run_id ?? null,
    field_name: params.field_name ?? null,
    previous_value: params.previous_value ?? null,
    new_value: params.new_value ?? null,
    approval_status: params.approval_status ?? null,
    sync_result: params.sync_result ?? null,
    verification_result: params.verification_result ?? null,
    metadata: JSON.stringify(params.metadata ?? {}),
    ip_address: params.ip_address ?? null,
  });
}
