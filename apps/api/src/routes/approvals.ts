import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { getDb } from '../database/db';
import { applyApprovedProposal } from '../agents/orchestrator';
import { recordAuditEvent } from '../services/productService';

export const approvalsRouter = Router();

// GET /api/approvals — list pending approvals
approvalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const db = getDb();
    const offset = (Number(page) - 1) * Number(limit);
    const statusFilter = status ?? 'pending';

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = ?`).get(statusFilter) as {
        c: number;
      }
    ).c;
    const rows = db
      .prepare(
        `
      SELECT a.*, p.name as product_name, p.sku as product_sku,
             prop.field_name, prop.current_value, prop.proposed_value,
             prop.reason, prop.confidence, prop.missing_evidence, prop.warnings,
             prop.validation_status, prop.validation_report
      FROM approvals a
      JOIN ai_proposals prop ON prop.id = a.proposal_id
      JOIN products p ON p.id = a.product_id
      WHERE a.status = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(statusFilter, Number(limit), offset) as Record<string, unknown>[];

    res.json({
      data: rows.map(parseApproval),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// GET /api/approvals/:id
approvalsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT a.*, p.name as product_name, p.sku as product_sku,
             prop.field_name, prop.current_value, prop.proposed_value,
             prop.reason, prop.confidence, prop.missing_evidence, prop.warnings,
             prop.validation_status, prop.validation_report, prop.agent_run_id
      FROM approvals a
      JOIN ai_proposals prop ON prop.id = a.proposal_id
      JOIN products p ON p.id = a.product_id
      WHERE a.id = ?
    `,
      )
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) throw new NotFoundError('Approval', req.params.id);
    res.json(parseApproval(row));
  }),
);

// POST /api/approvals/:id/approve — backend-enforced approval gate
approvalsRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const { comment } = z.object({ comment: z.string().optional() }).parse(req.body);
    const db = getDb();

    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id) as
      Record<string, unknown> | undefined;
    if (!approval) throw new NotFoundError('Approval', req.params.id);

    // Backend enforcement — only pending approvals can be approved
    if (approval.status !== 'pending') {
      throw new ForbiddenError(
        `Approval is in state '${approval.status}' — only 'pending' approvals can be approved`,
      );
    }

    db.prepare(
      `
      UPDATE approvals SET status = 'approved', reviewed_by = 'user', reviewed_at = datetime('now'),
      reviewer_comment = ?, updated_at = datetime('now') WHERE id = ?
    `,
    ).run(comment ?? null, req.params.id);

    db.prepare(
      `UPDATE ai_proposals SET approval_status = 'approved', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    ).run(approval.proposal_id);

    recordAuditEvent({
      event_type: 'approval.approved',
      actor: 'user',
      product_id: approval.product_id as string,
      proposal_id: approval.proposal_id as string,
      approval_status: 'approved',
      metadata: { comment },
    });

    // Apply asynchronously
    applyApprovedProposal(req.params.id, 'user').catch((err) => {
      db.prepare(
        `UPDATE approvals SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
      ).run(req.params.id);
      console.error('Apply failed:', err.message);
    });

    res.json({
      id: req.params.id,
      status: 'approved',
      message: 'Approval granted — applying change',
    });
  }),
);

// POST /api/approvals/:id/reject
approvalsRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const { comment } = z.object({ comment: z.string().min(1) }).parse(req.body);
    const db = getDb();

    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id) as
      Record<string, unknown> | undefined;
    if (!approval) throw new NotFoundError('Approval', req.params.id);

    if (!['pending', 'needs_review'].includes(approval.status as string)) {
      throw new ForbiddenError(`Approval cannot be rejected from state '${approval.status}'`);
    }

    db.prepare(
      `
      UPDATE approvals SET status = 'rejected', reviewed_by = 'user', reviewed_at = datetime('now'),
      reviewer_comment = ?, updated_at = datetime('now') WHERE id = ?
    `,
    ).run(comment, req.params.id);

    db.prepare(
      `UPDATE ai_proposals SET approval_status = 'rejected', reviewer_comment = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(comment, approval.proposal_id);

    recordAuditEvent({
      event_type: 'approval.rejected',
      actor: 'user',
      product_id: approval.product_id as string,
      proposal_id: approval.proposal_id as string,
      approval_status: 'rejected',
      metadata: { comment },
    });

    res.json({ id: req.params.id, status: 'rejected' });
  }),
);

function parseApproval(r: Record<string, unknown>) {
  return {
    ...r,
    before_snapshot: safeJson(r.before_snapshot as string, {}),
    after_snapshot: safeJson(r.after_snapshot as string, {}),
    warnings: safeJson(r.warnings as string, []),
    validation_report: safeJson(r.validation_report as string, {}),
    is_demo: Boolean(r.is_demo),
  };
}

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
