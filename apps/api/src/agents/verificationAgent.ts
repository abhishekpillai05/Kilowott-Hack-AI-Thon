import { getDb } from '../database/db';
import { updateProduct } from '../services/productService';
import { logger } from '../config/logger';
import type { VerificationInput, VerificationOutput } from '@catalogpilot/shared';

/**
 * Agent D — Sync Verification Agent
 *
 * Responsibility: After a product update is applied, independently re-fetch
 * the saved product and compare persisted values against expected changes.
 * Reports verified, failed, partial, or conflict.
 *
 * The result is based on OBSERVED data, not on another agent's assertion.
 */
export async function runVerificationAgent(
  input: VerificationInput,
  taskId: string,
): Promise<VerificationOutput> {
  const db = getDb();
  const start = Date.now();

  logger.info('[Verification] Starting', {
    product_id: input.product_id,
    approval: input.approval_id,
    taskId,
  });

  db.prepare(
    `UPDATE agent_tasks SET status = 'running', started_at = datetime('now') WHERE id = ?`,
  ).run(taskId);
  db.prepare(`UPDATE agent_tasks SET input_schema = ? WHERE id = ?`).run(
    JSON.stringify({
      product_id: input.product_id,
      expected_fields: Object.keys(input.expected_changes),
    }),
    taskId,
  );

  // Tool: re-fetch product from database (independent read)
  const retrievedAt = new Date().toISOString();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(input.product_id) as
    Record<string, unknown> | undefined;

  if (!row) {
    const output: VerificationOutput = {
      result: 'failed',
      field_results: [],
      summary: `Product ${input.product_id} not found after update — possible deletion or ID mismatch`,
      retrieved_at: retrievedAt,
    };
    db.prepare(
      `UPDATE agent_tasks SET status = 'completed', output_schema = ?, completed_at = datetime('now'), duration_ms = ? WHERE id = ?`,
    ).run(JSON.stringify(output), Date.now() - start, taskId);
    return output;
  }

  // Compare each expected field
  const fieldResults: VerificationOutput['field_results'] = [];
  let allMatched = true;
  let anyMatched = false;

  for (const [field, expectedValue] of Object.entries(input.expected_changes)) {
    let actual = row[field];
    // JSON fields need string comparison of content
    if (typeof actual === 'string' && (actual.startsWith('[') || actual.startsWith('{'))) {
      try {
        actual = JSON.stringify(JSON.parse(actual));
      } catch {
        /* keep raw */
      }
    }
    const actualStr = actual != null ? String(actual) : null;
    const matched = actualStr === expectedValue || actualStr?.trim() === expectedValue?.trim();

    fieldResults.push({
      field,
      expected: expectedValue,
      actual: actualStr,
      matched,
    });

    if (matched) anyMatched = true;
    else allMatched = false;
  }

  let result: VerificationOutput['result'];
  let summary: string;

  if (allMatched) {
    result = 'verified';
    summary = `All ${fieldResults.length} field(s) verified successfully. Product data matches approved changes.`;
  } else if (!anyMatched) {
    result = 'failed';
    summary = `Verification failed — none of the ${fieldResults.length} expected field(s) matched persisted values.`;
  } else {
    result = 'partial';
    const matched = fieldResults.filter((f) => f.matched).length;
    summary = `Partial verification: ${matched}/${fieldResults.length} fields matched. Review mismatched fields.`;
  }

  const output: VerificationOutput = {
    result,
    field_results: fieldResults,
    summary,
    retrieved_at: retrievedAt,
  };

  const duration = Date.now() - start;
  db.prepare(
    `
    UPDATE agent_tasks SET
      status = 'completed', output_schema = ?,
      completed_at = datetime('now'), duration_ms = ?
    WHERE id = ?
  `,
  ).run(JSON.stringify(output), duration, taskId);

  logger.info('[Verification] Completed', {
    product_id: input.product_id,
    result,
    matched: fieldResults.filter((f) => f.matched).length,
    total: fieldResults.length,
    ms: duration,
  });

  return output;
}
