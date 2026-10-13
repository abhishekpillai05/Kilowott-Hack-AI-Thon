import { logger } from '../config/logger';
import type { AIProvider, GenerateOptions, GenerateResult } from './provider';

/**
 * Demo provider — returns deterministic responses without any LLM call.
 * ALWAYS clearly labelled as demo in the response.
 * Used when GOOGLE_API_KEY is not configured.
 */
export class DemoProvider implements AIProvider {
  readonly name = 'demo';
  readonly model = 'demo-deterministic-v1';
  readonly isDemo = true;

  isAvailable(): boolean {
    return true; // always available
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    logger.info('[DEMO MODE] AI generate called — returning deterministic fixture');

    const text = this.pickResponse(options.prompt);
    // Simulate processing time so the UI feels realistic
    await sleep(400 + Math.random() * 600);

    return {
      text,
      provider: 'demo',
      model: 'demo-deterministic-v1',
      isDemo: true,
    };
  }

  private pickResponse(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (lower.includes('short_description') && lower.includes('laptop stand')) {
      return JSON.stringify({
        proposed_value:
          'Ergonomic adjustable aluminium laptop stand with 6 height positions and non-slip cooling design — compatible with 11"–17" laptops.',
        reason:
          'Concise summary capturing the key differentiators: material, adjustability, and compatibility range.',
        evidence: { source_name: 'Laptop Stand', source_sku: 'LP-STAND-ADJ' },
        confidence: 0.78,
        missing_evidence: null,
        warnings: [],
      });
    }

    if (lower.includes('description') && lower.includes('laptop stand')) {
      return JSON.stringify({
        proposed_value: `<p>The AdjustaRise Laptop Stand brings your screen to a comfortable, ergonomic eye level, reducing neck and shoulder strain during extended work sessions. The six-level height adjustment (15–35 cm) and multi-angle tilt (15°–45°) let you dial in the perfect viewing position whether you're sitting, standing, or using an external keyboard.</p>
<p>Constructed from aircraft-grade aluminium with a non-slip silicone base, it supports laptops from 11 to 17 inches and holds up to 10 kg. The open-vent design promotes airflow to prevent thermal throttling during demanding tasks. Folds flat in seconds for portable use.</p>
<ul>
  <li>6 height positions: 15–35 cm</li>
  <li>Tilt range: 15°–45°</li>
  <li>Supports laptops 11"–17", up to 10 kg</li>
  <li>Aircraft-grade aluminium build</li>
  <li>Non-slip silicone pads and base</li>
  <li>Open-vent cooling design</li>
  <li>Folds flat for portability</li>
</ul>`,
        reason:
          "Expanded from the original 16-character placeholder using the product's name, category context, and common attributes of adjustable laptop stands. All stated specifications are typical for this product class — verify against actual spec sheet before publishing.",
        evidence: {
          source_name: 'Laptop Stand',
          source_sku: 'LP-STAND-ADJ',
          source_category: 'Accessories',
          inference_basis: 'product_name_and_category',
        },
        confidence: 0.72,
        missing_evidence:
          'Exact height range, weight capacity, and compatible laptop sizes should be confirmed from the supplier spec sheet.',
        warnings: ['Specifications are inferred from product class — verify before publishing.'],
      });
    }

    if (lower.includes('meta_title') && lower.includes('laptop stand')) {
      return JSON.stringify({
        proposed_value: 'Adjustable Aluminium Laptop Stand | 6 Height Positions | 11"–17" Laptops',
        reason:
          'SEO title includes product type, key differentiators (aluminium, 6 positions), and compatibility to target relevant search queries within 60-char limit.',
        evidence: { source_name: 'Laptop Stand', length: 63 },
        confidence: 0.85,
        missing_evidence: null,
        warnings: [],
      });
    }

    if (lower.includes('meta_description') && lower.includes('laptop stand')) {
      return JSON.stringify({
        proposed_value:
          'Elevate your screen to eye level with this adjustable aluminium laptop stand. 6 height positions, non-slip base, fits 11"–17" laptops. Shop now.',
        reason:
          'Meta description within 120–160 char range, includes primary keyword, key features, and a call-to-action.',
        evidence: { source_name: 'Laptop Stand', length: 149 },
        confidence: 0.87,
        missing_evidence: null,
        warnings: [],
      });
    }

    if (lower.includes('description') && lower.includes('keyboard')) {
      return JSON.stringify({
        proposed_value: `<p>The TactileForce Mechanical Keyboard delivers a premium typing experience for productivity enthusiasts and gamers alike. Full-size TKL layout keeps the essentials within reach while preserving desk space.</p>
<p>Each key registers with satisfying tactile feedback and an audible click, reducing typing errors during long sessions. Durable double-shot PBT keycaps resist shine and fading for years of heavy use.</p>
<ul>
  <li>Tactile mechanical switches (certified 50 M+ keystrokes)</li>
  <li>TKL compact layout</li>
  <li>Double-shot PBT keycaps — shine resistant</li>
  <li>USB-C detachable cable</li>
  <li>N-key rollover — every simultaneous keypress registered</li>
</ul>`,
        reason:
          'Generated from product name and category context. Switch brand/type, layout, and cable spec are assumed from common TKL keyboards — verify against supplier data.',
        evidence: { source_name: 'TactileForce Mechanical Keyboard', source_sku: 'KB-MECH-001' },
        confidence: 0.68,
        missing_evidence:
          'Switch brand, exact switch variant, layout (TKL vs full), and cable type should be confirmed.',
        warnings: ['Switch specifications are assumed — do not publish without verification.'],
      });
    }

    if (lower.includes('alt') || lower.includes('alt text')) {
      return JSON.stringify({
        proposed_value:
          'Adjustable aluminium laptop stand — six-position height adjustment with non-slip silicone base',
        reason:
          'Descriptive alt text identifies the product type, key material, and primary feature for screen-reader users and image search.',
        evidence: { source_name: product_name_from_prompt(prompt) },
        confidence: 0.82,
        missing_evidence: null,
        warnings: [],
      });
    }

    // Generic fallback
    return JSON.stringify({
      proposed_value:
        '[Demo mode] This is a demonstration response. Configure GOOGLE_API_KEY to enable real AI generation.',
      reason:
        'Demo mode is active — no API key configured. This response is deterministic and not a real AI output.',
      evidence: {},
      confidence: 0.0,
      missing_evidence: 'GOOGLE_API_KEY not configured',
      warnings: [
        '⚠️ DEMO MODE — this is not a real AI response. Configure GOOGLE_API_KEY for live AI.',
      ],
    });
  }
}

function product_name_from_prompt(prompt: string): string {
  const match = prompt.match(/product name[:\s"']+([^"'\n]+)/i);
  return match ? match[1].trim() : 'Product';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
