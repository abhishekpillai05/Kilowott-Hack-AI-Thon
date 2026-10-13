import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { getDb } from '../database/db';
import { startWorkflow } from '../agents/orchestrator';

export const agentsRouter = Router();

// POST /api/agents/run — start a workflow for a product
agentsRouter.post(
  '/run',
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

    res.status(202).json({ run_id: runId, status: 'queued' });
  }),
);

// GET /api/agents/runs — list runs
agentsRouter.get(
  '/runs',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, product_id } = req.query as Record<string, string>;
    const db = getDb();
    const offset = (Number(page) - 1) * Number(limit);

    const where = product_id ? 'WHERE ar.product_id = ?' : '';
    const params = product_id ? [product_id] : [];

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM agent_runs ar ${where}`).get(...params) as { c: number }
    ).c;
    const runs = db
      .prepare(
        `
      SELECT ar.*, (
        SELECT COUNT(*) FROM agent_tasks WHERE run_id = ar.id
      ) as task_count
      FROM agent_runs ar ${where}
      ORDER BY ar.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params, Number(limit), offset) as Record<string, unknown>[];

    res.json({
      data: runs.map(parseRun),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// GET /api/agents/runs/:id — get run with tasks
agentsRouter.get(
  '/runs/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const run = db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(req.params.id) as
      Record<string, unknown> | undefined;
    if (!run) throw new NotFoundError('Agent run', req.params.id);

    const tasks = db
      .prepare('SELECT * FROM agent_tasks WHERE run_id = ? ORDER BY created_at ASC')
      .all(req.params.id) as Record<string, unknown>[];

    res.json({ ...parseRun(run), tasks: tasks.map(parseTask) });
  }),
);

function parseRun(r: Record<string, unknown>) {
  return {
    ...r,
    input_data: safeJson(r.input_data as string, {}),
    output_data: safeJson(r.output_data as string, {}),
    product_ids: safeJson(r.product_ids as string, []),
  };
}

function parseTask(t: Record<string, unknown>) {
  return {
    ...t,
    is_demo: Boolean(t.is_demo),
    input_schema: safeJson(t.input_schema as string, {}),
    output_schema: safeJson(t.output_schema as string, {}),
    tool_calls: safeJson(t.tool_calls as string, []),
  };
}

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
