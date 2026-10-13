import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('CatalogPilot API Endpoints', () => {
  it('GET /health returns healthy status and system metrics', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBeDefined();
    expect(res.body.ai).toBeDefined();
    expect(res.body.woocommerce).toBeDefined();
  });

  it('GET /api/products returns seeded products with pagination', async () => {
    const res = await request(app).get('/api/products?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it('GET /api/products/dashboard returns aggregated catalog metrics', async () => {
    const res = await request(app).get('/api/products/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.totalProducts).toBeGreaterThan(0);
    expect(res.body.healthScore).toBeGreaterThanOrEqual(0);
    expect(res.body.openIssues).toBeDefined();
  });

  it('GET /api/catalog-doctor/issues returns catalog issues', async () => {
    const res = await request(app).get('/api/catalog-doctor/issues');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/approvals returns pending approval list', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
