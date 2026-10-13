import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { asyncHandler } from '../middleware/errorHandler';
import { getDb } from '../database/db';
import { calculateHealthScore } from '../services/healthScoring';
import { scanProduct } from '../services/catalogDoctor';
import { recordAuditEvent, getProductById } from '../services/productService';
import type { Product } from '@catalogpilot/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const importExportRouter = Router();

// GET /api/import-export/export — export catalog to CSV or JSON
importExportRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) || 'csv';
    const db = getDb();
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as Record<
      string,
      unknown
    >[];

    const parsedProducts = products.map((p: any) => ({
      ...p,
      categories: safeJson(p.categories as string, []),
      tags: safeJson(p.tags as string, []),
      images: safeJson(p.images as string, []),
      attributes: safeJson(p.attributes as string, []),
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="catalogpilot-export.json"');
      res.send(JSON.stringify(parsedProducts, null, 2));
      return;
    }

    // CSV format
    const csvRows = parsedProducts.map((p: any) => ({
      id: p.id,
      sku: p.sku || '',
      name: p.name,
      price: p.price || '',
      regular_price: p.regular_price || '',
      sale_price: p.sale_price || '',
      status: p.status || 'publish',
      health_score: p.health_score || 0,
      description: p.description || '',
      short_description: p.short_description || '',
      meta_title: p.meta_title || '',
      meta_description: p.meta_description || '',
      categories: (p.categories as string[]).join(', '),
      tags: (p.tags as string[]).join(', '),
      stock_status: p.stock_status || 'instock',
    }));

    const csvOutput = stringify(csvRows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogpilot-export.csv"');
    res.send(csvOutput);
  }),
);

// POST /api/import-export/import — import products from CSV or JSON file
importExportRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    let records: Array<Record<string, unknown>> = [];

    if (req.file) {
      const content = req.file.buffer.toString('utf-8');
      if (req.file.originalname.endsWith('.json')) {
        records = JSON.parse(content);
      } else {
        records = parse(content, { columns: true, skip_empty_lines: true });
      }
    } else if (req.body && Array.isArray(req.body.products)) {
      records = req.body.products;
    } else {
      res.status(400).json({ error: 'NO_FILE', message: 'No file or products array uploaded' });
      return;
    }

    const db = getDb();
    let imported = 0;
    const now = new Date().toISOString();

    for (const r of records) {
      const name = String(r.name || '').trim();
      if (!name) continue;

      const id = r.id ? String(r.id) : `prod-${uuidv4().slice(0, 8)}`;
      const sku = r.sku ? String(r.sku).trim() : null;
      const price = String(r.price || '');
      const regularPrice = String(r.regular_price || price);
      const description = String(r.description || '');
      const shortDescription = String(r.short_description || '');
      const metaTitle = String(r.meta_title || '');
      const metaDescription = String(r.meta_description || '');
      const status = String(r.status || 'publish');

      let categories = '[]';
      if (Array.isArray(r.categories)) {
        categories = JSON.stringify(r.categories);
      } else if (typeof r.categories === 'string' && r.categories.trim()) {
        categories = JSON.stringify(
          r.categories
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }

      let tags = '[]';
      if (Array.isArray(r.tags)) {
        tags = JSON.stringify(r.tags);
      } else if (typeof r.tags === 'string' && r.tags.trim()) {
        tags = JSON.stringify(
          r.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }

      // Check if product exists
      const existing = db
        .prepare('SELECT id FROM products WHERE id = ? OR (sku IS NOT NULL AND sku = ?)')
        .get(id, sku);

      if (existing) {
        db.prepare(
          `
          UPDATE products
          SET name = @name, sku = @sku, price = @price, regular_price = @regularPrice,
              description = @description, short_description = @shortDescription,
              meta_title = @metaTitle, meta_description = @metaDescription,
              status = @status, categories = @categories, tags = @tags,
              updated_at = @now
          WHERE id = @id
        `,
        ).run({
          id,
          name,
          sku,
          price,
          regularPrice,
          description,
          shortDescription,
          metaTitle,
          metaDescription,
          status,
          categories,
          tags,
          now,
        });
      } else {
        db.prepare(
          `
          INSERT INTO products (
            id, name, sku, price, regular_price, description, short_description,
            meta_title, meta_description, status, categories, tags, source, created_at, updated_at
          ) VALUES (
            @id, @name, @sku, @price, @regularPrice, @description, @shortDescription,
            @metaTitle, @metaDescription, @status, @categories, @tags, 'import', @now, @now
          )
        `,
        ).run({
          id,
          name,
          sku,
          price,
          regularPrice,
          description,
          shortDescription,
          metaTitle,
          metaDescription,
          status,
          categories,
          tags,
          now,
        });
      }

      // Run health calculation and catalog doctor scan
      try {
        const freshProduct = getProductById(id);
        const { total } = calculateHealthScore(freshProduct);
        db.prepare('UPDATE products SET health_score = ? WHERE id = ?').run(total, id);
        // Async scan
        scanProduct(id).catch(() => {});
      } catch (err) {
        // Fallback calculation if needed
      }

      imported++;
    }

    recordAuditEvent({
      event_type: 'products.imported',
      actor: 'user',
      metadata: { imported_count: imported },
    });

    res.json({
      status: 'success',
      imported_count: imported,
      message: `Successfully processed ${imported} products`,
    });
  }),
);

function safeJson<T>(v: string | null | undefined, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
