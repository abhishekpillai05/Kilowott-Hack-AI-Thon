import { getDb } from '../database/db';
import { logger } from '../config/logger';
import type { ValidationInput, ValidationOutput, EnrichmentOutput } from '@catalogpilot/shared';

/**
 * Agent C — Validation Agent
 *
 * Responsibility: Independently validate a proposed change before it can be approved.
 * Checks field schemas, lengths, business rules, unsupported claims, and category requirements.
 * Does NOT approve or apply changes.
 */

interface FieldCheck {
  field: string;
  passed: boolean;
  rule: string;
  message: string;
}

export async function runValidationAgent(
  input: ValidationInput,
  taskId: string,
): Promise<ValidationOutput> {
  const db = getDb();
  const start = Date.now();

  logger.info('[Validation] Starting', {
    product_id: input.proposal.product_id,
    field: input.proposal.field_name,
    taskId,
  });

  db.prepare(
    `UPDATE agent_tasks SET status = 'running', started_at = datetime('now') WHERE id = ?`,
  ).run(taskId);
  db.prepare(`UPDATE agent_tasks SET input_schema = ? WHERE id = ?`).run(
    JSON.stringify({
      product_id: input.proposal.product_id,
      field: input.proposal.field_name,
    }),
    taskId,
  );

  const checks: FieldCheck[] = [];
  const proposal = input.proposal;

  // ── 1. Proposed value must not be empty ──────────────────────────────────
  checks.push({
    field: proposal.field_name,
    passed: proposal.proposed_value.trim().length > 0,
    rule: 'not_empty',
    message:
      proposal.proposed_value.trim().length > 0
        ? 'Proposed value is not empty'
        : 'Proposed value is empty — nothing to apply',
  });

  // ── 2. Not identical to current value ────────────────────────────────────
  const notIdentical =
    proposal.proposed_value.trim() !==
    (input.product as Record<string, unknown>)[proposal.field_name as string];
  checks.push({
    field: proposal.field_name,
    passed: notIdentical,
    rule: 'not_identical',
    message: notIdentical
      ? 'Proposed value differs from current value'
      : 'Proposed value is identical to current — no change needed',
  });

  // ── 3. Field-specific rules ───────────────────────────────────────────────
  const fieldRules = getFieldRules(proposal.field_name);
  checks.push(...fieldRules.map((r) => r(proposal)));

  // ── 4. Unsupported claim detection ───────────────────────────────────────
  const unsupportedClaims = detectUnsupportedClaims(proposal);

  // ── 5. Confidence threshold ───────────────────────────────────────────────
  checks.push({
    field: 'confidence',
    passed: proposal.confidence >= 0.5,
    rule: 'min_confidence',
    message:
      proposal.confidence >= 0.5
        ? `Confidence ${(proposal.confidence * 100).toFixed(0)}% meets threshold`
        : `Confidence ${(proposal.confidence * 100).toFixed(0)}% is below 50% minimum — needs review`,
  });

  // ── 6. Demo mode label check ──────────────────────────────────────────────
  if (proposal.is_demo) {
    checks.push({
      field: 'model',
      passed: true,
      rule: 'demo_label',
      message:
        '⚠️ This proposal was generated in DEMO MODE — not a real AI output. Verify content before applying.',
    });
  }

  // ── Determine outcome ─────────────────────────────────────────────────────
  const failedRequired = checks.filter((c) => !c.passed && c.rule !== 'min_confidence');
  const lowConfidence = checks.some((c) => c.rule === 'min_confidence' && !c.passed);

  let status: ValidationOutput['status'];
  if (failedRequired.length > 0) {
    status = 'invalid';
  } else if (lowConfidence || unsupportedClaims.length > 0 || proposal.warnings.length > 0) {
    status = 'needs_review';
  } else {
    status = 'valid';
  }

  const riskLevel = determineRisk(proposal, checks, unsupportedClaims);

  const output: ValidationOutput = {
    is_valid: status !== 'invalid',
    status,
    field_checks: checks,
    unsupported_claims: unsupportedClaims,
    risk_level: riskLevel,
    summary: buildSummary(status, failedRequired, unsupportedClaims, proposal),
  };

  const duration = Date.now() - start;
  db.prepare(
    `
    UPDATE agent_tasks SET
      status = 'completed', output_schema = ?,
      completed_at = datetime('now'), duration_ms = ?, handoff_to = 'orchestrator'
    WHERE id = ?
  `,
  ).run(JSON.stringify(output), duration, taskId);

  logger.info('[Validation] Completed', {
    product_id: proposal.product_id,
    field: proposal.field_name,
    status,
    ms: duration,
  });

  return output;
}

// ─── Field-specific rules ─────────────────────────────────────────────────────

function getFieldRules(field: string): Array<(p: EnrichmentOutput) => FieldCheck> {
  const rules: Record<string, Array<(p: EnrichmentOutput) => FieldCheck>> = {
    description: [
      (p) => ({
        field: 'description',
        passed: stripHtml(p.proposed_value).length >= 50,
        rule: 'min_length',
        message:
          stripHtml(p.proposed_value).length >= 50
            ? `Description has ${stripHtml(p.proposed_value).length} visible chars (min 50)`
            : `Description too short: ${stripHtml(p.proposed_value).length} chars (min 50)`,
      }),
      (p) => ({
        field: 'description',
        passed: stripHtml(p.proposed_value).length <= 10000,
        rule: 'max_length',
        message: `Description length ${stripHtml(p.proposed_value).length} within limit (max 10000)`,
      }),
    ],
    short_description: [
      (p) => ({
        field: 'short_description',
        passed: p.proposed_value.length >= 20 && p.proposed_value.length <= 500,
        rule: 'length_range',
        message: `Short description length ${p.proposed_value.length} (required 20–500 chars)`,
      }),
    ],
    meta_title: [
      (p) => ({
        field: 'meta_title',
        passed: p.proposed_value.length >= 10 && p.proposed_value.length <= 70,
        rule: 'seo_title_length',
        message: `Meta title is ${p.proposed_value.length} chars (recommended 10–70)`,
      }),
    ],
    meta_description: [
      (p) => ({
        field: 'meta_description',
        passed: p.proposed_value.length >= 50 && p.proposed_value.length <= 200,
        rule: 'seo_desc_length',
        message: `Meta description is ${p.proposed_value.length} chars (recommended 50–200)`,
      }),
    ],
  };
  return rules[field] ?? [];
}

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\b(FDA|CE|UL|RoHS|REACH|BIFMA|ISO)\s*(?:certified|approved|compliant|listed)\b/i,
  /\bworks with\s+(?:all|any)\s+(?:devices|laptops|phones|computers)\b/i,
  /\b(?:lifetime|forever)\s+warranty\b/i,
  /\b(?:world['']?s|best|#1|number one|fastest|most popular)\b/i,
];

function detectUnsupportedClaims(proposal: EnrichmentOutput): string[] {
  const claims: string[] = [];
  for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
    if (pattern.test(proposal.proposed_value)) {
      claims.push(`Potentially unsupported claim detected: "${pattern.source}"`);
    }
  }
  return claims;
}

function determineRisk(
  proposal: EnrichmentOutput,
  checks: FieldCheck[],
  unsupportedClaims: string[],
): 'low' | 'medium' | 'high' {
  if (unsupportedClaims.length > 0) return 'high';
  if (proposal.warnings.length > 2) return 'high';
  if (checks.some((c) => !c.passed)) return 'medium';
  if (proposal.confidence < 0.6) return 'medium';
  return 'low';
}

function buildSummary(
  status: string,
  failed: FieldCheck[],
  claims: string[],
  proposal: EnrichmentOutput,
): string {
  if (status === 'invalid') {
    return `Validation failed: ${failed.map((f) => f.message).join('; ')}`;
  }
  if (status === 'needs_review') {
    const reasons = [
      ...claims,
      ...proposal.warnings,
      ...(proposal.confidence < 0.6
        ? [`Low confidence (${(proposal.confidence * 100).toFixed(0)}%)`]
        : []),
    ];
    return `Proposal needs human review: ${reasons.join('; ')}`;
  }
  return `All checks passed. Confidence: ${(proposal.confidence * 100).toFixed(0)}%. Ready for approval.`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
