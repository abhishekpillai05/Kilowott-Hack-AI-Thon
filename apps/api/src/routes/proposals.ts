import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { getDb } from '../database/db';
import { startWorkflow } from '../agents/orchestrator';

export const proposalsRouter = Router();

// GET /api/proposals — list proposals with optional filtering
proposalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        product_id: z.string().optional(),
        status: z.string().optional(),
        approval_status: z.string().optional(),
      })
      .parse(req.query);

    const db = getDb();
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.product_id) {
      conditions.push('p.product_id = @product_id');
      params.product_id = query.product_id;
    }
    if (query.approval_status) {
      conditions.push('p.approval_status = @approval_status');
      params.approval_status = query.approval_status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.limit;

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM ai_proposals p ${where}`).get(params) as { c: number }
    ).c;

    const proposals = db
      .prepare(
        `
      SELECT p.*, prod.name as product_name, prod.sku as product_sku
      FROM ai_proposals p
      LEFT JOIN products prod ON prod.id = p.product_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT @limit OFFSET @offset
    `,
      )
      .all({ ...params, limit: query.limit, offset }) as Record<string, unknown>[];

    res.json({
      data: proposals.map(parseProposal),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  }),
);

// GET /api/proposals/:id — get proposal by ID
proposalsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const proposal = db
      .prepare(
        `
      SELECT p.*, prod.name as product_name, prod.sku as product_sku
      FROM ai_proposals p
      LEFT JOIN products prod ON prod.id = p.product_id
      WHERE p.id = ?
    `,
      )
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!proposal) {
      throw new NotFoundError('Proposal', req.params.id);
    }

    res.json(parseProposal(proposal));
  }),
);

// POST /api/proposals/generate — trigger AI proposal workflow
proposalsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        product_id: z.string(),
        issue_id: z.string().optional(),
        field_name: z.string().optional(),
      })
      .parse(req.body);

    const runId = await startWorkflow({
      productId: body.product_id,
      issueId: body.issue_id,
      fieldName: body.field_name,
      triggeredBy: 'user',
    });

    res.status(202).json({
      run_id: runId,
      status: 'queued',
      message: 'AI enrichment and proposal workflow started',
    });
  }),
);

function parseProposal(row: Record<string, unknown>) {
  return {
    ...row,
    evidence: safeJson(row.evidence as string, {}),
    warnings: safeJson(row.warnings as string, []),
    validation_report: safeJson(row.validation_report as string, {}),
    apply_result: safeJson(row.apply_result as string, {}),
    verification_report: safeJson(row.verification_report as string, {}),
  };
}

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
