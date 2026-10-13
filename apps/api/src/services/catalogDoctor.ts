import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { calculateHealthScore } from './healthScoring';
import { recordAuditEvent } from './productService';
import type { CatalogIssue } from '@catalogpilot/shared';

interface RuleResult {
  issueType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation: string;
  autoFixable: boolean;
  ruleId: string;
}

// ─── Diagnostic Rules ─────────────────────────────────────────────────────────

type ProductRow = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === 'string' ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DIAGNOSTIC_RULES: Array<{
  id: string;
  label: string;
  check: (product: ProductRow, allProducts?: ProductRow[]) => RuleResult | null;
}> = [
  {
    id: 'content.description.missing',
    label: 'Missing description',
    check(p) {
      const desc = stripHtml((p.description as string) ?? '');
      if (desc.length > 0) return null;
      return {
        issueType: 'description',
        severity: 'critical',
        title: 'Missing product description',
        description:
          'This product has no description. Customers cannot evaluate it without product information.',
        evidence: { description_length: 0 },
        recommendation:
          'Write a comprehensive description (200+ chars) covering key features, specifications, and benefits.',
        autoFixable: true,
        ruleId: 'content.description.missing',
      };
    },
  },
  {
    id: 'content.description.weak',
    label: 'Weak description',
    check(p) {
      const desc = stripHtml((p.description as string) ?? '');
      if (desc.length === 0 || desc.length >= 100) return null;
      return {
        issueType: 'description',
        severity: 'critical',
        title: 'Product description is too short',
        description: `The description is only ${desc.length} characters — insufficient for customer decisions or search ranking.`,
        evidence: {
          description_length: desc.length,
          min_recommended: 200,
          current: desc.slice(0, 80),
        },
        recommendation:
          'Expand the description to at least 200 characters, covering features, materials, compatibility, and benefits.',
        autoFixable: true,
        ruleId: 'content.description.weak',
      };
    },
  },
  {
    id: 'content.short_description.missing',
    label: 'Missing short description',
    check(p) {
      const sd = stripHtml((p.short_description as string) ?? '');
      if (sd.length >= 20) return null;
      return {
        issueType: 'description',
        severity: 'medium',
        title: 'Missing short description',
        description:
          'No short description is shown on product listing pages, reducing click-through rates.',
        evidence: { short_description_length: sd.length },
        recommendation: 'Add a concise 1–2 sentence summary for catalog cards.',
        autoFixable: true,
        ruleId: 'content.short_description.missing',
      };
    },
  },
  {
    id: 'seo.meta.missing',
    label: 'Missing SEO metadata',
    check(p) {
      const title = ((p.meta_title as string) ?? '').trim();
      const desc = ((p.meta_description as string) ?? '').trim();
      if (title.length > 0 && desc.length > 0) return null;
      const missing = [
        title.length === 0 ? 'meta_title' : null,
        desc.length === 0 ? 'meta_description' : null,
      ].filter(Boolean);
      return {
        issueType: 'seo',
        severity: 'high',
        title: 'Missing SEO metadata',
        description: `Missing: ${missing.join(', ')}. This product will not appear in search engine results.`,
        evidence: { meta_title: title, meta_description: desc },
        recommendation:
          'Add an SEO title (50–60 chars) and description (120–160 chars) with target keywords.',
        autoFixable: true,
        ruleId: 'seo.meta.missing',
      };
    },
  },
  {
    id: 'seo.meta_description.length',
    label: 'SEO meta description length',
    check(p) {
      const desc = ((p.meta_description as string) ?? '').trim();
      if (desc.length === 0) return null; // handled by missing rule
      if (desc.length >= 80 && desc.length <= 180) return null;
      const tooShort = desc.length < 80;
      return {
        issueType: 'seo',
        severity: 'low',
        title: `Meta description is too ${tooShort ? 'short' : 'long'}`,
        description: `Meta description is ${desc.length} chars. Recommended: 80–180 chars.`,
        evidence: { current_length: desc.length, optimal_range: '80–180' },
        recommendation: tooShort
          ? 'Expand the meta description to include more keywords and a call-to-action.'
          : 'Shorten the meta description to under 180 characters.',
        autoFixable: true,
        ruleId: 'seo.meta_description.length',
      };
    },
  },
  {
    id: 'media.image.missing',
    label: 'No product images',
    check(p) {
      const images = parseJson<Array<{ src?: string }>>(p.images as string, []);
      const withSrc = images.filter((i) => i.src && i.src.trim());
      if (withSrc.length > 0) return null;
      return {
        issueType: 'media',
        severity: 'high',
        title: 'No product images',
        description: 'Products without images have significantly lower conversion rates.',
        evidence: { image_count: 0 },
        recommendation:
          'Upload at least one high-quality product image (min 800×800 px recommended).',
        autoFixable: false,
        ruleId: 'media.image.missing',
      };
    },
  },
  {
    id: 'media.image.missing_alt',
    label: 'Missing image alt text',
    check(p) {
      const images = parseJson<Array<{ src?: string; alt?: string }>>(p.images as string, []);
      const withSrc = images.filter((i) => i.src && i.src.trim());
      if (withSrc.length === 0) return null;
      const withoutAlt = withSrc.filter((i) => !i.alt || i.alt.trim() === '');
      if (withoutAlt.length === 0) return null;
      return {
        issueType: 'media',
        severity: 'medium',
        title: 'Missing image alt text',
        description: `${withoutAlt.length} of ${withSrc.length} image(s) have no alt text, hurting accessibility and SEO.`,
        evidence: { images_without_alt: withoutAlt.length, total_images: withSrc.length },
        recommendation: 'Add descriptive alt text to every product image.',
        autoFixable: true,
        ruleId: 'media.image.missing_alt',
      };
    },
  },
  {
    id: 'sku.missing',
    label: 'Missing SKU',
    check(p) {
      const sku = ((p.sku as string) ?? '').trim();
      if (sku.length > 0) return null;
      return {
        issueType: 'identifier',
        severity: 'high',
        title: 'Missing SKU',
        description:
          'No SKU is assigned. SKUs are essential for inventory management and order fulfilment.',
        evidence: { sku: '' },
        recommendation:
          'Assign a unique SKU following your naming convention (e.g., CATEGORY-NAME-VARIANT).',
        autoFixable: false,
        ruleId: 'sku.missing',
      };
    },
  },
  {
    id: 'sku.duplicate',
    label: 'Duplicate SKU',
    check(p, allProducts) {
      const sku = ((p.sku as string) ?? '').trim();
      if (!sku || !allProducts) return null;
      const conflict = allProducts.find(
        (other) => other.id !== p.id && ((other.sku as string) ?? '').trim() === sku,
      );
      if (!conflict) return null;
      return {
        issueType: 'duplicate',
        severity: 'high',
        title: `Duplicate SKU: ${sku}`,
        description: `SKU "${sku}" is also used by "${conflict.name}" (${conflict.id}). This causes inventory and fulfilment failures.`,
        evidence: {
          sku,
          conflicting_product_id: conflict.id,
          conflicting_product_name: conflict.name,
        },
        recommendation: `Assign a unique SKU to this product, e.g. "${sku}-v2".`,
        autoFixable: false,
        ruleId: 'sku.duplicate',
      };
    },
  },
  {
    id: 'price.missing',
    label: 'Missing price',
    check(p) {
      if ((p.status as string) !== 'publish') return null;
      const price = parseFloat((p.price as string) ?? (p.regular_price as string) ?? '');
      if (!isNaN(price) && price > 0) return null;
      return {
        issueType: 'price',
        severity: 'critical',
        title: 'Published product has no price',
        description: 'This live product has no price set. Customers cannot add it to their cart.',
        evidence: { price: p.price, regular_price: p.regular_price },
        recommendation: 'Set a valid numeric price before this product can be purchased.',
        autoFixable: false,
        ruleId: 'price.missing',
      };
    },
  },
  {
    id: 'attributes.missing',
    label: 'No attributes',
    check(p) {
      const attrs = parseJson<unknown[]>(p.attributes as string, []);
      if (attrs.length > 0) return null;
      return {
        issueType: 'attributes',
        severity: 'medium',
        title: 'No product attributes defined',
        description:
          'No structured attributes (specs, variants, features) are defined for this product.',
        evidence: { attribute_count: 0 },
        recommendation:
          'Add relevant attributes for this product category to aid filtering and comparison.',
        autoFixable: false,
        ruleId: 'attributes.missing',
      };
    },
  },
  {
    id: 'taxonomy.tags.missing',
    label: 'No tags',
    check(p) {
      const tags = parseJson<unknown[]>(p.tags as string, []);
      if (tags.length > 0) return null;
      return {
        issueType: 'other',
        severity: 'low',
        title: 'No product tags',
        description:
          'No tags defined — this reduces discoverability in site search and related products.',
        evidence: { tag_count: 0 },
        recommendation: 'Add 3–8 relevant tags describing the product type, use, and key features.',
        autoFixable: true,
        ruleId: 'taxonomy.tags.missing',
      };
    },
  },
];

// ─── Scanner ──────────────────────────────────────────────────────────────────

export async function scanProduct(productId: string): Promise<{
  issues: CatalogIssue[];
  healthScore: number;
  scannedAt: string;
}> {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as
    ProductRow | undefined;
  if (!product) throw new Error(`Product ${productId} not found`);

  const allProducts = db.prepare('SELECT id, sku, name FROM products').all() as ProductRow[];
  const scannedAt = new Date().toISOString();

  // Run all rules
  const ruleResults: RuleResult[] = [];
  for (const rule of DIAGNOSTIC_RULES) {
    const result = rule.check(product, allProducts);
    if (result) ruleResults.push(result);
  }

  // Resolve existing open issues for this product
  const existingIds = new Set<string>(
    (
      db
        .prepare("SELECT rule_id FROM catalog_issues WHERE product_id = ? AND status = 'open'")
        .all(productId) as Array<{ rule_id: string }>
    ).map((r) => r.rule_id),
  );

  // Determine which rules triggered
  const triggeredRuleIds = new Set(ruleResults.map((r) => r.ruleId));

  // Auto-resolve issues whose rule no longer triggers
  db.transaction(() => {
    for (const existingRuleId of existingIds) {
      if (!triggeredRuleIds.has(existingRuleId)) {
        db.prepare(
          `UPDATE catalog_issues SET status = 'resolved', resolved_at = datetime('now'), updated_at = datetime('now')
           WHERE product_id = ? AND rule_id = ? AND status = 'open'`,
        ).run(productId, existingRuleId);
      }
    }
  })();

  // Insert or skip (open issues for same rule already exist)
  const newIssues: CatalogIssue[] = [];
  db.transaction(() => {
    for (const r of ruleResults) {
      if (!existingIds.has(r.ruleId)) {
        const id = uuidv4();
        db.prepare(
          `
          INSERT INTO catalog_issues (
            id, product_id, issue_type, severity, title, description, evidence,
            recommendation, auto_fixable, status, rule_id, detected_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 'catalog_doctor', datetime('now'), datetime('now'))
        `,
        ).run(
          id,
          productId,
          r.issueType,
          r.severity,
          r.title,
          r.description,
          JSON.stringify(r.evidence),
          r.recommendation,
          r.autoFixable ? 1 : 0,
          r.ruleId,
        );
        newIssues.push({
          id,
          product_id: productId,
          issue_type: r.issueType as CatalogIssue['issue_type'],
          severity: r.severity,
          title: r.title,
          description: r.description,
          evidence: r.evidence,
          recommendation: r.recommendation,
          auto_fixable: r.autoFixable,
          status: 'open',
          rule_id: r.ruleId,
          detected_by: 'catalog_doctor',
          created_at: scannedAt,
          updated_at: scannedAt,
        });
      }
    }
  })();

  // Recalculate health score
  const scoring = calculateHealthScore({
    description: product.description as string,
    short_description: product.short_description as string,
    meta_title: product.meta_title as string,
    meta_description: product.meta_description as string,
    images: parseJson(product.images as string, []),
    attributes: parseJson(product.attributes as string, []),
    sku: product.sku as string,
    price: product.price as string,
    regular_price: product.regular_price as string,
  });

  const issueCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM catalog_issues WHERE product_id = ? AND status = 'open'")
      .get(productId) as { c: number }
  ).c;

  db.prepare(
    `UPDATE products SET health_score = ?, issues_count = ?, last_scanned_at = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(scoring.total, issueCount, scannedAt, productId);

  // Fetch all open issues
  const allIssues = db
    .prepare(
      "SELECT * FROM catalog_issues WHERE product_id = ? AND status = 'open' ORDER BY severity",
    )
    .all(productId) as Array<Record<string, unknown>>;

  recordAuditEvent({
    event_type: 'catalog.scan',
    actor: 'catalog_doctor',
    product_id: productId,
    metadata: {
      issues_found: ruleResults.length,
      new_issues: newIssues.length,
      health_score: scoring.total,
    },
  });

  return {
    issues: allIssues.map((i) => ({
      ...i,
      auto_fixable: Boolean(i.auto_fixable),
      evidence: safeParseJson(i.evidence as string, {}),
    })) as CatalogIssue[],
    healthScore: scoring.total,
    scannedAt,
  };
}

export async function scanAllProducts(): Promise<{
  productsScanned: number;
  totalIssues: number;
  scannedAt: string;
}> {
  const db = getDb();
  const products = db.prepare('SELECT id FROM products').all() as Array<{ id: string }>;
  let totalIssues = 0;

  for (const p of products) {
    const result = await scanProduct(p.id);
    totalIssues += result.issues.length;
  }

  const scannedAt = new Date().toISOString();
  recordAuditEvent({
    event_type: 'catalog.scan.full',
    actor: 'catalog_doctor',
    metadata: { products_scanned: products.length, total_issues: totalIssues },
  });

  return { productsScanned: products.length, totalIssues, scannedAt };
}

function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
  try {
    return val ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}
