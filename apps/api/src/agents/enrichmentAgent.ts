import { getDb } from '../database/db';
import { getAIProvider } from '../ai';
import { logger } from '../config/logger';
import type { EnrichmentInput, EnrichmentOutput } from '@catalogpilot/shared';

/**
 * Agent B — Enrichment Agent
 *
 * Responsibility: Receive an identified issue, retrieve product evidence,
 * propose an improvement using the configured AI provider (or demo),
 * and return a schema-validated proposal.
 *
 * Does NOT mutate the live product.
 */
export async function runEnrichmentAgent(
  input: EnrichmentInput,
  taskId: string,
): Promise<EnrichmentOutput> {
  const db = getDb();
  const provider = getAIProvider();
  const start = Date.now();

  logger.info('[Enrichment] Starting', {
    product_id: input.product_id,
    field: input.field_name,
    taskId,
  });

  db.prepare(
    `UPDATE agent_tasks SET status = 'running', started_at = datetime('now'), model_provider = ?, is_demo = ? WHERE id = ?`,
  ).run(provider.name, provider.isDemo ? 1 : 0, taskId);
  db.prepare(`UPDATE agent_tasks SET input_schema = ? WHERE id = ?`).run(
    JSON.stringify(input),
    taskId,
  );

  // Tool: fetch_product
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(input.product_id) as
    Record<string, unknown> | undefined;
  if (!product) throw new Error(`Product ${input.product_id} not found`);

  const toolCalls: Record<string, unknown>[] = [
    {
      tool: 'fetch_product',
      args: { product_id: input.product_id },
      result: {
        name: product.name,
        sku: product.sku,
        category: parseFirstCategory(product.categories as string),
      },
      calledAt: new Date().toISOString(),
    },
  ];

  // Build evidence context
  const evidence: Record<string, unknown> = {
    product_name: product.name,
    product_sku: product.sku,
    product_category: parseFirstCategory(product.categories as string),
    current_value: input.current_value,
    issue_field: input.field_name,
    ...input.evidence,
  };

  // Build prompt
  const systemInstruction = `You are a professional e-commerce product content specialist.
Your task is to improve a specific product field based on available evidence.
Rules:
- Never invent specifications, certifications, or compatibility claims not supported by the evidence
- If evidence is insufficient, state that clearly and reduce confidence
- Always provide reasoning and note any uncertainty
- Respond ONLY with valid JSON matching the required schema`;

  const prompt = buildPrompt(input.field_name, product, evidence);

  let rawResponse: string;
  const llmCallStart = Date.now();
  try {
    const result = await provider.generate({
      prompt,
      systemInstruction,
      maxOutputTokens: 1024,
      temperature: 0.4,
    });
    rawResponse = result.text;
    toolCalls.push({
      tool: 'ai_generate',
      args: { field: input.field_name, provider: provider.name, isDemo: provider.isDemo },
      result: { chars: rawResponse.length },
      calledAt: new Date().toISOString(),
      durationMs: Date.now() - llmCallStart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(
      `UPDATE agent_tasks SET status = 'failed', error_message = ?, completed_at = datetime('now'), duration_ms = ? WHERE id = ?`,
    ).run(`AI generation failed: ${msg}`, Date.now() - start, taskId);
    throw new Error(`Enrichment agent: AI call failed — ${msg}`);
  }

  // Parse and validate response
  let parsed: {
    proposed_value?: string;
    reason?: string;
    evidence?: Record<string, unknown>;
    confidence?: number;
    missing_evidence?: string | null;
    warnings?: string[];
  };

  try {
    // Strip markdown fences if present
    const clean = rawResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(clean);
  } catch {
    logger.warn('[Enrichment] Failed to parse AI response — using fallback', {
      raw: rawResponse.slice(0, 200),
    });
    parsed = {
      proposed_value: '[Unable to parse AI response — please regenerate]',
      reason: 'The AI returned a response that could not be parsed as JSON.',
      confidence: 0.1,
      missing_evidence: 'Malformed AI output',
      warnings: ['AI response could not be parsed'],
    };
  }

  if (!parsed.proposed_value) {
    throw new Error('Enrichment agent: AI returned no proposed_value');
  }

  const output: EnrichmentOutput = {
    product_id: input.product_id,
    issue_id: input.issue_id,
    field_name: input.field_name,
    proposed_value: parsed.proposed_value,
    reason: parsed.reason ?? 'No reason provided',
    evidence: { ...evidence, ...(parsed.evidence ?? {}) },
    confidence:
      typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
    missing_evidence: parsed.missing_evidence ?? null,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    model_used: `${provider.name}/${provider.model}`,
    is_demo: provider.isDemo,
  };

  const duration = Date.now() - start;
  db.prepare(
    `
    UPDATE agent_tasks SET
      status = 'completed', output_schema = ?, tool_calls = ?,
      completed_at = datetime('now'), duration_ms = ?, handoff_to = 'validation'
    WHERE id = ?
  `,
  ).run(JSON.stringify(output), JSON.stringify(toolCalls), duration, taskId);

  logger.info('[Enrichment] Completed', {
    product_id: input.product_id,
    field: input.field_name,
    confidence: output.confidence,
    ms: duration,
  });
  return output;
}

function parseFirstCategory(json: string): string {
  try {
    const cats = JSON.parse(json ?? '[]') as Array<{ name?: string }>;
    return cats[0]?.name ?? 'Uncategorized';
  } catch {
    return 'Uncategorized';
  }
}

function buildPrompt(
  field: string,
  product: Record<string, unknown>,
  evidence: Record<string, unknown>,
): string {
  const base = `
Product Name: "${product.name}"
Product SKU: "${product.sku ?? 'N/A'}"
Category: "${parseFirstCategory(product.categories as string)}"
Current ${field}: "${product[field] ?? ''}"

Available evidence:
${JSON.stringify(evidence, null, 2)}

Task: Propose an improved "${field}" for this product.

Respond with a JSON object matching this exact schema:
{
  "proposed_value": "string — the improved content",
  "reason": "string — why this is an improvement and what sources you used",
  "evidence": { "key": "value" },
  "confidence": 0.0 to 1.0,
  "missing_evidence": "string or null — what information would improve this further",
  "warnings": ["array of strings — any concerns or unverified claims"]
}`;

  const fieldInstructions: Record<string, string> = {
    description:
      'Write a comprehensive HTML product description (200–800 chars of visible text). Use <p> and <ul> tags. Do not invent specifications not evidenced.',
    short_description:
      'Write a concise 1–2 sentence plain-text summary (40–120 chars) for product listing cards.',
    meta_title: 'Write an SEO title (50–60 chars). Include product name and key differentiator.',
    meta_description: 'Write an SEO meta description (120–160 chars). Include a call-to-action.',
    'images[0].alt':
      'Write a concise, descriptive image alt text (40–100 chars) describing what is visible in the product image.',
  };

  return (fieldInstructions[field] ?? `Improve the "${field}" field.`) + '\n\n' + base;
}
