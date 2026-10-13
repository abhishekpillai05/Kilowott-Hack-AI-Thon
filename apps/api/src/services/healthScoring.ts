import type { HealthScoreBreakdown } from '@catalogpilot/shared';

interface ProductForScoring {
  description?: string;
  short_description?: string;
  meta_title?: string;
  meta_description?: string;
  images?: Array<{ src?: string; alt?: string }>;
  attributes?: Array<unknown>;
  sku?: string;
  price?: string;
  regular_price?: string;
  name?: string;
  categories?: Array<unknown>;
  tags?: Array<unknown>;
}

/**
 * Calculates a deterministic product health score (0–100).
 *
 * Scoring breakdown (documented for testability):
 * - Description quality:   25 points
 * - SEO metadata:          20 points
 * - Media (images/alt):    20 points
 * - Attributes:            15 points
 * - Identifier (SKU):      10 points
 * - Price validity:        10 points
 *
 * Each dimension scores 0–its max. Final = sum clamped to [0, 100].
 */
export function calculateHealthScore(product: ProductForScoring): HealthScoreBreakdown {
  const breakdown: HealthScoreBreakdown = {
    total: 0,
    description: 0,
    seo: 0,
    media: 0,
    attributes: 0,
    identifier: 0,
    price: 0,
    penalties: 0,
  };

  // ── Description (25 pts) ──────────────────────────────────────────────────
  const descLen = stripHtml(product.description ?? '').length;
  const shortLen = stripHtml(product.short_description ?? '').length;

  if (descLen >= 300) {
    breakdown.description = 20;
  } else if (descLen >= 100) {
    breakdown.description = 12;
  } else if (descLen >= 20) {
    breakdown.description = 6;
  } else if (descLen > 0) {
    breakdown.description = 2;
  }

  if (shortLen >= 50) {
    breakdown.description += 5;
  } else if (shortLen > 0) {
    breakdown.description += 2;
  }

  // ── SEO (20 pts) ──────────────────────────────────────────────────────────
  const metaTitle = (product.meta_title ?? '').trim();
  const metaDesc = (product.meta_description ?? '').trim();

  if (metaTitle.length >= 20 && metaTitle.length <= 70) {
    breakdown.seo += 10;
  } else if (metaTitle.length > 0) {
    breakdown.seo += 5;
  }

  if (metaDesc.length >= 80 && metaDesc.length <= 180) {
    breakdown.seo += 10;
  } else if (metaDesc.length > 0) {
    breakdown.seo += 4;
  }

  // ── Media (20 pts) ────────────────────────────────────────────────────────
  const rawImages = product.images;
  const images = Array.isArray(rawImages)
    ? rawImages
    : typeof rawImages === 'string'
      ? safeJsonArray(rawImages)
      : [];
  const imagesWithSrc = images.filter((i) => i && i.src && String(i.src).trim() !== '');
  const imagesWithAlt = imagesWithSrc.filter((i) => i && i.alt && String(i.alt).trim() !== '');

  if (imagesWithSrc.length >= 3) {
    breakdown.media += 12;
  } else if (imagesWithSrc.length === 2) {
    breakdown.media += 10;
  } else if (imagesWithSrc.length === 1) {
    breakdown.media += 7;
  }

  if (imagesWithSrc.length > 0) {
    const altRatio = imagesWithAlt.length / imagesWithSrc.length;
    breakdown.media += Math.round(8 * altRatio);
  }

  // ── Attributes (15 pts) ───────────────────────────────────────────────────
  const rawAttrs = product.attributes;
  const attrs = Array.isArray(rawAttrs)
    ? rawAttrs
    : typeof rawAttrs === 'string'
      ? safeJsonArray(rawAttrs)
      : [];
  if (attrs.length >= 4) {
    breakdown.attributes = 15;
  } else if (attrs.length >= 2) {
    breakdown.attributes = 10;
  } else if (attrs.length === 1) {
    breakdown.attributes = 5;
  }

  // ── SKU / Identifier (10 pts) ─────────────────────────────────────────────
  const sku = (product.sku ?? '').trim();
  if (sku.length >= 3) {
    breakdown.identifier = 10;
  } else if (sku.length > 0) {
    breakdown.identifier = 4;
  }

  // ── Price (10 pts) ────────────────────────────────────────────────────────
  const price = parseFloat(product.price ?? product.regular_price ?? '');
  if (!isNaN(price) && price > 0) {
    breakdown.price = 10;
  }

  // ── Compute total ─────────────────────────────────────────────────────────
  breakdown.total = Math.min(
    100,
    breakdown.description +
      breakdown.seo +
      breakdown.media +
      breakdown.attributes +
      breakdown.identifier +
      breakdown.price -
      breakdown.penalties,
  );

  return breakdown;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeJsonArray(val: string): any[] {
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}
