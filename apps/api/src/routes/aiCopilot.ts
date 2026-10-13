import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getDb } from '../database/db';
import { getAIProvider } from '../ai';
import { isDemoMode } from '../config/env';

export const aiCopilotRouter = Router();

// POST /api/copilot/chat — Catalog Pilot conversational assistant
aiCopilotRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message, product_id } = z
      .object({
        message: z.string().min(1),
        product_id: z.string().optional(),
      })
      .parse(req.body);

    const db = getDb();
    const isDemo = isDemoMode();

    // Fetch catalog context
    const totalCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
    const avgHealth = Math.round(
      (db.prepare('SELECT AVG(health_score) as a FROM products').get() as { a: number }).a || 0,
    );
    const openIssues = (
      db.prepare("SELECT COUNT(*) as c FROM catalog_issues WHERE status = 'open'").get() as {
        c: number;
      }
    ).c;
    const criticalIssues = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM catalog_issues WHERE status = 'open' AND severity = 'critical'",
        )
        .get() as {
        c: number;
      }
    ).c;

    let targetProduct: Record<string, unknown> | null = null;
    if (product_id) {
      targetProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as Record<
        string,
        unknown
      > | null;
    }

    // Try AI provider if enabled and not forced demo mode
    if (!isDemo) {
      try {
        const provider = getAIProvider();
        const prompt = `You are CatalogPilot AI Copilot, an expert AI assistant for e-commerce Product Information Management.
Context:
- Catalog Size: ${totalCount} products
- Average Health Score: ${avgHealth}/100
- Open Issues: ${openIssues} (${criticalIssues} critical)
${targetProduct ? `- Focused Product: ${targetProduct.name} (SKU: ${targetProduct.sku}, Score: ${targetProduct.health_score}/100)` : ''}

Merchant Question: "${message}"

Provide a concise, highly practical, and actionable answer with specific recommendations. Return markdown formatting.`;

        const response = await provider.generate({
          prompt,
          maxOutputTokens: 800,
          temperature: 0.3,
        });
        res.json({
          reply: response.text,
          is_demo: false,
          model: response.model,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (err) {
        // Fall back to intelligent assistant heuristics
      }
    }

    // Deterministic Assistant Heuristics for Demo Mode
    const lower = message.toLowerCase();
    let reply = '';

    if (lower.includes('health') || lower.includes('overview') || lower.includes('status')) {
      reply = `### 📊 Catalog Health Overview
- **Total Products:** ${totalCount}
- **Average Health Score:** **${avgHealth}/100**
- **Active Issues:** ${openIssues} (${criticalIssues} critical)

**Recommendation:** Focus first on resolving the ${criticalIssues} critical issues (e.g., missing prices or duplicate SKUs) to immediately boost catalog health and customer conversion.`;
    } else if (
      lower.includes('critical') ||
      lower.includes('worst') ||
      lower.includes('attention') ||
      lower.includes('fix first')
    ) {
      const worst = db
        .prepare(
          `SELECT id, name, sku, health_score, issues_count FROM products WHERE issues_count > 0 ORDER BY health_score ASC LIMIT 3`,
        )
        .all() as Array<{
        id: string;
        name: string;
        sku: string;
        health_score: number;
        issues_count: number;
      }>;

      reply = `### 🚨 Top Products Needing Attention
Here are the products currently impacting your catalog quality the most:

${worst.map((p, i) => `${i + 1}. **${p.name}** (SKU: \`${p.sku || 'MISSING'}\`) — **Health: ${p.health_score}/100** with ${p.issues_count} open issues.`).join('\n')}

Click on any product in the **Catalog Doctor** to trigger the AI multi-agent repair workflow!`;
    } else if (targetProduct) {
      reply = `### 🔍 Analysis for **${targetProduct.name}**
- **SKU:** \`${targetProduct.sku || 'N/A'}\`
- **Health Score:** ${targetProduct.health_score}/100
- **Status:** ${targetProduct.status}
- **Current Price:** $${targetProduct.price || targetProduct.regular_price || 'Not set'}

**Suggested Actions:**
1. Generate an enriched SEO title and meta description using our Multi-Agent Enrichment engine.
2. Review product attributes to ensure filtering in WooCommerce works seamlessly.`;
    } else {
      reply = `### 🤖 CatalogPilot Copilot
I can help you analyze and optimize your e-commerce catalog!

Here are some things you can ask me:
- *"Give me an overview of our catalog health."*
- *"Which products have critical issues?"*
- *"How can I improve the ProFlex Ergonomic Mouse?"*
- *"What are the biggest SEO gaps in our catalog?"*

Your catalog currently has **${totalCount} products** with **${openIssues} open issues**.`;
    }

    res.json({
      reply,
      is_demo: true,
      model: 'catalogpilot-copilot-demo',
      timestamp: new Date().toISOString(),
    });
  }),
);
