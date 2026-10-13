import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { runAuditorAgent } from './auditorAgent';
import { runEnrichmentAgent } from './enrichmentAgent';
import { runValidationAgent } from './validationAgent';
import { runVerificationAgent } from './verificationAgent';
import { getProductById, updateProduct, recordAuditEvent } from '../services/productService';
import { logger } from '../config/logger';
import type {
  AgentRunStatus,
  AuditorInput,
  EnrichmentInput,
  ValidationInput,
  VerificationInput,
} from '@catalogpilot/shared';

/**
 * Orchestrator — coordinates the full agent workflow:
 *
 * queued → auditing → enriching → validating → awaiting_approval
 *       → (human approves) → applying → verifying → completed
 *
 * Each state transition is recorded. Agents exchange typed structured outputs.
 * Consequential mutations only happen after explicit human approval.
 */

export interface OrchestratorOptions {
  productId: string;
  issueId?: string;
  fieldName?: string;
  triggeredBy?: string;
}

export async function startWorkflow(opts: OrchestratorOptions): Promise<string> {
  const db = getDb();
  const runId = uuidv4();

  const run = {
    id: runId,
    type: opts.issueId ? 'single_product' : 'full_audit',
    status: 'queued' as AgentRunStatus,
    product_id: opts.productId,
    product_ids: JSON.stringify([opts.productId]),
    input_data: JSON.stringify({
      productId: opts.productId,
      issueId: opts.issueId,
      fieldName: opts.fieldName,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `
    INSERT INTO agent_runs (id, type, status, product_id, product_ids, input_data, created_at, updated_at)
    VALUES (@id, @type, @status, @product_id, @product_ids, @input_data, @created_at, @updated_at)
  `,
  ).run(run);

  recordAuditEvent({
    event_type: 'agent.run.started',
    actor: opts.triggeredBy ?? 'user',
    product_id: opts.productId,
    run_id: runId,
    metadata: { type: run.type, field: opts.fieldName },
  });

  // Run asynchronously (don't block the HTTP response)
  executeWorkflow(runId, opts).catch((err) => {
    logger.error('[Orchestrator] Workflow failed', { runId, error: err.message });
    setRunStatus(runId, 'failed', err.message);
  });

  return runId;
}

async function executeWorkflow(runId: string, opts: OrchestratorOptions): Promise<void> {
  const db = getDb();
  const { productId, fieldName } = opts;

  try {
    // ── Phase 1: Auditing ────────────────────────────────────────────────────
    setRunStatus(runId, 'auditing');
    const auditorTaskId = createTask(runId, 'auditor');

    const auditorInput: AuditorInput = { product_id: productId, force_rescan: false };
    const auditorOutput = await runAuditorAgent(auditorInput, auditorTaskId);

    if (auditorOutput.issues.length === 0) {
      setRunStatus(runId, 'completed', undefined, {
        message: 'No issues found — product is healthy',
      });
      return;
    }

    // Select the issue to enrich
    const issueToFix = opts.issueId
      ? (auditorOutput.issues.find((i) => i.id === opts.issueId) ?? auditorOutput.issues[0])
      : auditorOutput.issues[0];

    const targetField = fieldName ?? mapIssueToField(issueToFix.issue_type, issueToFix.rule_id);

    // ── Phase 2: Enriching ───────────────────────────────────────────────────
    setRunStatus(runId, 'enriching');
    const enrichmentTaskId = createTask(runId, 'enrichment');

    const product = getProductById(productId);
    const currentValue = (product as Record<string, unknown>)[targetField] as string | undefined;

    const enrichmentInput: EnrichmentInput = {
      product_id: productId,
      issue_id: issueToFix.id,
      field_name: targetField,
      current_value: currentValue ?? null,
      evidence: issueToFix.evidence as Record<string, unknown>,
      is_demo: false,
    };

    const enrichmentOutput = await runEnrichmentAgent(enrichmentInput, enrichmentTaskId);

    // ── Phase 3: Validating ──────────────────────────────────────────────────
    setRunStatus(runId, 'validating');
    const validationTaskId = createTask(runId, 'validation');

    const validationInput: ValidationInput = {
      proposal: enrichmentOutput,
      product,
    };

    const validationOutput = await runValidationAgent(validationInput, validationTaskId);

    // ── Phase 4: Store proposal ──────────────────────────────────────────────
    const proposalId = uuidv4();
    const approvalStatus = validationOutput.status === 'invalid' ? 'rejected' : 'pending';
    const approvalId = uuidv4();

    db.prepare(
      `
      INSERT INTO ai_proposals (
        id, product_id, issue_id, agent_run_id, field_name, current_value, proposed_value,
        reason, evidence, confidence, missing_evidence, warnings,
        validation_status, validation_report, approval_status, created_at, updated_at
      ) VALUES (
        @id, @product_id, @issue_id, @agent_run_id, @field_name, @current_value, @proposed_value,
        @reason, @evidence, @confidence, @missing_evidence, @warnings,
        @validation_status, @validation_report, @approval_status, datetime('now'), datetime('now')
      )
    `,
    ).run({
      id: proposalId,
      product_id: productId,
      issue_id: issueToFix.id,
      agent_run_id: runId,
      field_name: targetField,
      current_value: currentValue ?? null,
      proposed_value: enrichmentOutput.proposed_value,
      reason: enrichmentOutput.reason,
      evidence: JSON.stringify(enrichmentOutput.evidence),
      confidence: enrichmentOutput.confidence,
      missing_evidence: enrichmentOutput.missing_evidence ?? null,
      warnings: JSON.stringify(enrichmentOutput.warnings),
      validation_status: validationOutput.status,
      validation_report: JSON.stringify(validationOutput),
      approval_status: approvalStatus,
    });

    // Create approval record
    if (approvalStatus === 'pending') {
      db.prepare(
        `
        INSERT INTO approvals (
          id, proposal_id, product_id, status, risk_level,
          before_snapshot, after_snapshot, created_at, updated_at
        ) VALUES (
          @id, @proposal_id, @product_id, 'pending', @risk_level,
          @before_snapshot, @after_snapshot, datetime('now'), datetime('now')
        )
      `,
      ).run({
        id: approvalId,
        proposal_id: proposalId,
        product_id: productId,
        risk_level: validationOutput.risk_level,
        before_snapshot: JSON.stringify({ [targetField]: currentValue }),
        after_snapshot: JSON.stringify({ [targetField]: enrichmentOutput.proposed_value }),
      });
    }

    // Update run output
    db.prepare(
      `UPDATE agent_runs SET output_data = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(
      JSON.stringify({ proposalId, approvalId, validationStatus: validationOutput.status }),
      runId,
    );

    recordAuditEvent({
      event_type: 'proposal.created',
      actor: 'enrichment_agent',
      product_id: productId,
      proposal_id: proposalId,
      run_id: runId,
      field_name: targetField,
      metadata: {
        validation_status: validationOutput.status,
        confidence: enrichmentOutput.confidence,
        is_demo: enrichmentOutput.is_demo,
      },
    });

    // ── Phase 5: Awaiting approval (pause for human) ─────────────────────────
    if (approvalStatus === 'pending') {
      setRunStatus(runId, 'awaiting_approval', undefined, { proposalId, approvalId });
      logger.info('[Orchestrator] Awaiting human approval', { runId, proposalId });
    } else {
      setRunStatus(runId, 'completed', undefined, {
        message: `Proposal rejected during validation: ${validationOutput.summary}`,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[Orchestrator] Workflow error', { runId, error: msg });
    setRunStatus(runId, 'failed', msg);
    recordAuditEvent({
      event_type: 'agent.run.failed',
      actor: 'orchestrator',
      run_id: runId,
      metadata: { error: msg },
    });
  }
}

/**
 * Called after human approves a proposal.
 * Applies the change through the product service and invokes verification.
 */
export async function applyApprovedProposal(
  approvalId: string,
  reviewerId = 'user',
): Promise<void> {
  const db = getDb();

  // Fetch approval + proposal with lock
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(approvalId) as
    Record<string, unknown> | undefined;
  if (!approval) throw new Error(`Approval ${approvalId} not found`);
  if (approval.status !== 'approved')
    throw new Error(
      `Approval ${approvalId} is not in approved state (current: ${approval.status})`,
    );

  const proposal = db
    .prepare('SELECT * FROM ai_proposals WHERE id = ?')
    .get(approval.proposal_id as string) as Record<string, unknown> | undefined;
  if (!proposal) throw new Error(`Proposal ${approval.proposal_id} not found`);

  const productId = proposal.product_id as string;
  const fieldName = proposal.field_name as string;
  const proposedValue = proposal.proposed_value as string;
  const runId = proposal.agent_run_id as string | null;

  // ── Pre-apply checks ─────────────────────────────────────────────────────
  const currentProduct = getProductById(productId); // throws if gone

  // Stale-data check: if field already matches proposed, skip
  const currentValue = (currentProduct as Record<string, unknown>)[fieldName] as string | undefined;
  if (currentValue === proposedValue) {
    db.prepare(
      `UPDATE approvals SET status = 'verified', updated_at = datetime('now') WHERE id = ?`,
    ).run(approvalId);
    db.prepare(
      `UPDATE ai_proposals SET approval_status = 'applied', applied_at = datetime('now'), apply_result = ? WHERE id = ?`,
    ).run(
      JSON.stringify({ message: 'Field already matches proposed value — no update needed' }),
      proposal.id,
    );
    return;
  }

  // ── Applying ─────────────────────────────────────────────────────────────
  db.prepare(
    `UPDATE approvals SET status = 'applying', updated_at = datetime('now') WHERE id = ?`,
  ).run(approvalId);
  if (runId) setRunStatus(runId, 'applying');

  try {
    const updates: Record<string, string> = { [fieldName]: proposedValue };

    // Handle nested fields like images[0].alt
    if (fieldName.startsWith('images[')) {
      const images = JSON.parse(JSON.stringify(currentProduct.images ?? []));
      const match = fieldName.match(/^images\[(\d+)\]\.(.+)$/);
      if (match) {
        const [, idxStr, subField] = match;
        const idx = parseInt(idxStr, 10);
        if (images[idx]) images[idx][subField] = proposedValue;
        (updates as Record<string, unknown>).images = images;
        delete updates[fieldName];
      }
    }

    updateProduct(productId, updates as Record<string, string>, reviewerId);

    db.prepare(
      `UPDATE ai_proposals SET approval_status = 'applied', applied_at = datetime('now'), apply_result = ? WHERE id = ?`,
    ).run(JSON.stringify({ applied_fields: Object.keys(updates) }), proposal.id);

    recordAuditEvent({
      event_type: 'proposal.applied',
      actor: reviewerId,
      product_id: productId,
      proposal_id: proposal.id as string,
      run_id: runId,
      field_name: fieldName,
      previous_value: currentValue,
      new_value: proposedValue,
      approval_status: 'approved',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(
      `UPDATE approvals SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
    ).run(approvalId);
    db.prepare(
      `UPDATE ai_proposals SET approval_status = 'failed', apply_result = ? WHERE id = ?`,
    ).run(JSON.stringify({ error: msg }), proposal.id);
    if (runId) setRunStatus(runId, 'failed', msg);
    throw err;
  }

  // ── Verifying ─────────────────────────────────────────────────────────────
  db.prepare(
    `UPDATE approvals SET status = 'verifying', updated_at = datetime('now') WHERE id = ?`,
  ).run(approvalId);
  if (runId) setRunStatus(runId, 'verifying');

  const verificationTaskId = runId ? createTask(runId, 'sync_verification') : uuidv4();
  if (!runId) {
    // Standalone verification task (no run)
    db.prepare(
      `
      INSERT INTO agent_tasks (id, run_id, agent_type, status, created_at)
      VALUES (?, ?, 'sync_verification', 'queued', datetime('now'))
    `,
    ).run(verificationTaskId, approvalId);
  }

  const verificationInput: VerificationInput = {
    product_id: productId,
    expected_changes: { [fieldName]: proposedValue },
    approval_id: approvalId,
  };

  const verificationOutput = await runVerificationAgent(verificationInput, verificationTaskId);

  // Record verification result
  const finalStatus = verificationOutput.result === 'verified' ? 'verified' : 'failed';
  db.prepare(`UPDATE approvals SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
    finalStatus,
    approvalId,
  );
  db.prepare(
    `UPDATE ai_proposals SET verification_status = ?, verification_report = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(verificationOutput.result, JSON.stringify(verificationOutput), proposal.id);

  if (runId) {
    setRunStatus(
      runId,
      verificationOutput.result === 'verified' ? 'completed' : 'needs_review',
      verificationOutput.result !== 'verified' ? verificationOutput.summary : undefined,
    );
  }

  recordAuditEvent({
    event_type: 'proposal.verified',
    actor: 'verification_agent',
    product_id: productId,
    proposal_id: proposal.id as string,
    run_id: runId,
    field_name: fieldName,
    verification_result: verificationOutput.result,
    metadata: { summary: verificationOutput.summary },
  });

  logger.info('[Orchestrator] Workflow complete', {
    runId,
    productId,
    verification: verificationOutput.result,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTask(runId: string, agentType: string): string {
  const db = getDb();
  const taskId = uuidv4();
  db.prepare(
    `
    INSERT INTO agent_tasks (id, run_id, agent_type, status, created_at)
    VALUES (?, ?, ?, 'queued', datetime('now'))
  `,
  ).run(taskId, runId, agentType);
  return taskId;
}

function setRunStatus(
  runId: string,
  status: AgentRunStatus,
  errorMsg?: string,
  outputData?: Record<string, unknown>,
): void {
  const db = getDb();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (errorMsg) updates.error_message = errorMsg;
  if (outputData) updates.output_data = JSON.stringify(outputData);
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.completed_at = new Date().toISOString();
  }
  if (status === 'auditing') {
    updates.started_at = new Date().toISOString();
  }

  const setClauses = Object.keys(updates)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(`UPDATE agent_runs SET ${setClauses} WHERE id = @id`).run({ ...updates, id: runId });
}

function mapIssueToField(issueType: string, ruleId?: string): string {
  if (ruleId === 'content.description.missing' || ruleId === 'content.description.weak')
    return 'description';
  if (ruleId === 'content.short_description.missing') return 'short_description';
  if (ruleId === 'seo.meta.missing' || ruleId === 'seo.meta_title.length') return 'meta_title';
  if (ruleId === 'seo.meta_description.length') return 'meta_description';
  if (ruleId === 'media.image.missing_alt') return 'images[0].alt';
  if (issueType === 'description') return 'description';
  if (issueType === 'seo') return 'meta_title';
  if (issueType === 'media') return 'images[0].alt';
  return 'description';
}
