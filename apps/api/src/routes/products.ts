import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import {
  listProducts,
  getProductById,
  updateProduct,
  getProductIssues,
  getDashboardMetrics,
} from '../services/productService';
import { calculateHealthScore } from '../services/healthScoring';

export const productsRouter = Router();

// GET /api/products — list with pagination, filtering, sorting
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        status: z.string().optional(),
        source: z.string().optional(),
        sort: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional(),
        hasIssues: z
          .string()
          .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined))
          .optional(),
        minHealth: z.coerce.number().int().min(0).max(100).optional(),
        maxHealth: z.coerce.number().int().min(0).max(100).optional(),
      })
      .parse(req.query);

    const result = listProducts(query);
    res.json(result);
  }),
);

// GET /api/products/dashboard — aggregated metrics
productsRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const metrics = getDashboardMetrics();
    res.json(metrics);
  }),
);

// GET /api/products/:id — single product
productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = getProductById(req.params.id);
    res.json(product);
  }),
);

// GET /api/products/:id/issues — issues for a product
productsRouter.get(
  '/:id/issues',
  asyncHandler(async (req, res) => {
    getProductById(req.params.id); // validates existence
    const issues = getProductIssues(req.params.id);
    res.json(issues);
  }),
);

// GET /api/products/:id/health-score
productsRouter.get(
  '/:id/health-score',
  asyncHandler(async (req, res) => {
    const product = getProductById(req.params.id);
    const breakdown = calculateHealthScore(product);
    res.json({ product_id: req.params.id, ...breakdown });
  }),
);

// PATCH /api/products/:id — partial update (inline edit)
productsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'sku',
      'name',
      'description',
      'short_description',
      'price',
      'regular_price',
      'sale_price',
      'status',
      'meta_title',
      'meta_description',
      'stock_status',
      'stock_quantity',
      'weight',
      'categories',
      'tags',
      'images',
      'attributes',
      'dimensions',
    ];
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (allowedFields.includes(k)) updates[k] = v;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'NO_UPDATES', message: 'No valid fields to update' });
      return;
    }

    const updated = updateProduct(req.params.id, updates as Record<string, string>, 'user');
    res.json(updated);
  }),
);
