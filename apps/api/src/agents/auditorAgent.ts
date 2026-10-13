import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { scanProduct } from '../services/catalogDoctor';
import { logger } from '../config/logger';
import type { AuditorInput, AuditorOutput } from '@catalogpilot/shared';

/**
 * Agent A — Catalog Auditor
 *
 * Responsibility: Inspect a product record, run deterministic diagnostic rules,
 * classify issues, and return a structured issue report.
 *
 * This agent never mutates product data — it only reads and reports.
 */
export async function runAuditorAgent(input: AuditorInput, taskId: string): Promise<AuditorOutput> {
  const db = getDb();
  const start = Date.now();

  logger.info('[Auditor] Starting audit', { product_id: input.product_id, taskId });

  db.prepare(
    `UPDATE agent_tasks SET status = 'running', started_at = datetime('now') WHERE id = ?`,
  ).run(taskId);
  db.prepare(`UPDATE agent_tasks SET input_schema = ? WHERE id = ?`).run(
    JSON.stringify(input),
    taskId,
  );

  // Tool call: scan_product
  const toolCall: Record<string, unknown> = {
    tool: 'scan_product',
    args: { product_id: input.product_id },
    calledAt: new Date().toISOString(),
  };

  let output: AuditorOutput;
  try {
    const result = await scanProduct(input.product_id);
    output = {
      product_id: input.product_id,
      issues: result.issues,
      health_score: result.healthScore,
      scanned_at: result.scannedAt,
    };
    toolCall['result'] = { issues_found: result.issues.length, health_score: result.healthScore };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(
      `UPDATE agent_tasks SET status = 'failed', error_message = ?, completed_at = datetime('now'), duration_ms = ? WHERE id = ?`,
    ).run(msg, Date.now() - start, taskId);
    throw err;
  }

  const duration = Date.now() - start;
  db.prepare(
    `
    UPDATE agent_tasks SET
      status = 'completed', output_schema = ?, tool_calls = ?,
      completed_at = datetime('now'), duration_ms = ?, handoff_to = 'enrichment'
    WHERE id = ?
  `,
  ).run(JSON.stringify(output), JSON.stringify([toolCall]), duration, taskId);

  logger.info('[Auditor] Completed', {
    product_id: input.product_id,
    issues: output.issues.length,
    ms: duration,
  });
  return output;
}
