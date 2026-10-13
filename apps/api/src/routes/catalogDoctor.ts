import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { scanProduct, scanAllProducts, DIAGNOSTIC_RULES } from '../services/catalogDoctor';
import { getDb } from '../database/db';

export const catalogDoctorRouter = Router();

// GET /api/catalog-doctor/issues — all open issues with pagination
catalogDoctorRouter.get(
  '/issues',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        severity: z.string().optional(),
        issue_type: z.string().optional(),
        status: z.string().optional(),
        product_id: z.string().optional(),
      })
      .parse(req.query);

    const db = getDb();
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.severity) {
      conditions.push('ci.severity = @severity');
      params.severity = query.severity;
    }
    if (query.issue_type) {
      conditions.push('ci.issue_type = @issue_type');
      params.issue_type = query.issue_type;
    }
    if (query.status) {
      conditions.push('ci.status = @status');
      params.status = query.status;
    } else {
      conditions.push("ci.status = 'open'");
    }
    if (query.product_id) {
      conditions.push('ci.product_id = @product_id');
      params.product_id = query.product_id;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.limit;

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM catalog_issues ci ${where}`).get(params) as {
        c: number;
      }
    ).c;
    const issues = db
      .prepare(
        `
      SELECT ci.*, p.name as product_name, p.sku as product_sku
      FROM catalog_issues ci
      LEFT JOIN products p ON p.id = ci.product_id
      ${where}
      ORDER BY CASE ci.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
               ci.created_at DESC
      LIMIT @limit OFFSET @offset
    `,
      )
      .all({ ...params, limit: query.limit, offset }) as Record<string, unknown>[];

    res.json({
      data: issues.map(parseIssue),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  }),
);

// POST /api/catalog-doctor/scan — scan a single product
catalogDoctorRouter.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const { product_id } = z.object({ product_id: z.string() }).parse(req.body);
    const result = await scanProduct(product_id);
    res.json(result);
  }),
);

// POST /api/catalog-doctor/scan-all — scan all products
catalogDoctorRouter.post(
  '/scan-all',
  asyncHandler(async (_req, res) => {
    const result = await scanAllProducts();
    res.json(result);
  }),
);

// GET /api/catalog-doctor/rules — list all diagnostic rules
catalogDoctorRouter.get(
  '/rules',
  asyncHandler(async (_req, res) => {
    res.json(DIAGNOSTIC_RULES.map((r) => ({ id: r.id, label: r.label })));
  }),
);

// PATCH /api/catalog-doctor/issues/:id/status
catalogDoctorRouter.patch(
  '/issues/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({
        status: z.enum(['open', 'in_progress', 'resolved', 'ignored', 'wont_fix']),
      })
      .parse(req.body);

    const db = getDb();
    const issue = db.prepare('SELECT * FROM catalog_issues WHERE id = ?').get(req.params.id) as
      Record<string, unknown> | undefined;
    if (!issue) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found' });
      return;
    }

    db.prepare(
      `
      UPDATE catalog_issues SET status = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?
    `,
    ).run(status, status === 'resolved' ? new Date().toISOString() : null, req.params.id);

    res.json({ id: req.params.id, status });
  }),
);

// GET /api/catalog-doctor/summary
catalogDoctorRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const bySeverity = db
      .prepare(
        `
      SELECT severity, COUNT(*) as count FROM catalog_issues WHERE status = 'open' GROUP BY severity
    `,
      )
      .all() as Array<{ severity: string; count: number }>;

    const byType = db
      .prepare(
        `
      SELECT issue_type, COUNT(*) as count FROM catalog_issues WHERE status = 'open' GROUP BY issue_type
    `,
      )
      .all() as Array<{ issue_type: string; count: number }>;

    const topProducts = db
      .prepare(
        `
      SELECT p.id, p.name, p.sku, COUNT(ci.id) as issue_count
      FROM catalog_issues ci JOIN products p ON p.id = ci.product_id
      WHERE ci.status = 'open'
      GROUP BY p.id ORDER BY issue_count DESC LIMIT 5
    `,
      )
      .all();

    res.json({ bySeverity, byType, topProducts });
  }),
);

function parseIssue(row: Record<string, unknown>) {
  return {
    ...row,
    auto_fixable: Boolean(row.auto_fixable),
    evidence: safeJson(row.evidence as string, {}),
  };
}

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
