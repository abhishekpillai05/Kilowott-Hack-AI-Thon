import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getDb } from '../database/db';

export const reportsRouter = Router();

// GET /api/reports/category-completeness — category breakdown with average health & issues
reportsRouter.get(
  '/category-completeness',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const products = db
      .prepare('SELECT id, categories, health_score, issues_count FROM products')
      .all() as Array<{
      id: string;
      categories: string;
      health_score: number;
      issues_count: number;
    }>;

    const categoryMap = new Map<
      string,
      { totalProducts: number; totalHealth: number; totalIssues: number }
    >();

    for (const p of products) {
      let cats: string[] = [];
      try {
        cats = JSON.parse(p.categories || '[]');
      } catch {
        cats = ['Uncategorized'];
      }
      if (cats.length === 0) cats = ['Uncategorized'];

      for (const cat of cats) {
        const existing = categoryMap.get(cat) || {
          totalProducts: 0,
          totalHealth: 0,
          totalIssues: 0,
        };
        existing.totalProducts += 1;
        existing.totalHealth += p.health_score || 0;
        existing.totalIssues += p.issues_count || 0;
        categoryMap.set(cat, existing);
      }
    }

    const report = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      product_count: stats.totalProducts,
      avg_health_score: Math.round(stats.totalHealth / (stats.totalProducts || 1)),
      total_issues: stats.totalIssues,
      completeness_grade:
        stats.totalHealth / (stats.totalProducts || 1) >= 80
          ? 'A'
          : stats.totalHealth / (stats.totalProducts || 1) >= 60
            ? 'B'
            : stats.totalHealth / (stats.totalProducts || 1) >= 40
              ? 'C'
              : 'D',
    }));

    report.sort((a, b) => b.product_count - a.product_count);

    res.json({ categories: report });
  }),
);

// GET /api/reports/issue-trends — issues aggregated by severity and type
reportsRouter.get(
  '/issue-trends',
  asyncHandler(async (_req, res) => {
    const db = getDb();

    const bySeverity = db
      .prepare(`SELECT severity, COUNT(*) as count FROM catalog_issues GROUP BY severity`)
      .all() as Array<{ severity: string; count: number }>;

    const byType = db
      .prepare(
        `SELECT issue_type, COUNT(*) as count FROM catalog_issues GROUP BY issue_type ORDER BY count DESC`,
      )
      .all() as Array<{ issue_type: string; count: number }>;

    const byStatus = db
      .prepare(`SELECT status, COUNT(*) as count FROM catalog_issues GROUP BY status`)
      .all() as Array<{ status: string; count: number }>;

    const healthDistribution = db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN health_score >= 80 THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN health_score >= 60 AND health_score < 80 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN health_score >= 40 AND health_score < 60 THEN 1 ELSE 0 END) as needs_work,
        SUM(CASE WHEN health_score < 40 THEN 1 ELSE 0 END) as critical,
        COUNT(*) as total
      FROM products
    `,
      )
      .get() as Record<string, number>;

    res.json({
      by_severity: bySeverity,
      by_type: byType,
      by_status: byStatus,
      health_distribution: healthDistribution,
    });
  }),
);

// GET /api/reports/audit-log — audit trail of catalog changes
reportsRouter.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(25),
        event_type: z.string().optional(),
        product_id: z.string().optional(),
      })
      .parse(req.query);

    const db = getDb();
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.event_type) {
      conditions.push('ae.event_type = @event_type');
      params.event_type = query.event_type;
    }
    if (query.product_id) {
      conditions.push('ae.product_id = @product_id');
      params.product_id = query.product_id;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.limit;

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM audit_events ae ${where}`).get(params) as { c: number }
    ).c;

    const events = db
      .prepare(
        `
      SELECT ae.*, p.name as product_name
      FROM audit_events ae
      LEFT JOIN products p ON p.id = ae.product_id
      ${where}
      ORDER BY ae.created_at DESC
      LIMIT @limit OFFSET @offset
    `,
      )
      .all({ ...params, limit: query.limit, offset }) as Record<string, unknown>[];

    res.json({
      data: events.map((e) => ({
        ...e,
        metadata: safeJson(e.metadata as string, {}),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  }),
);

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
