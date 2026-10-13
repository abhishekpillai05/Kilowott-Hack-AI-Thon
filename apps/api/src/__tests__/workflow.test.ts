import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';
import { runValidationAgent } from '../agents/validationAgent';
import type { EnrichmentOutput } from '@catalogpilot/shared';

describe('End-to-End Workflow & Edge Cases', () => {
  let importedProductId: string;

  // 1. Product Import
  it('imports new products via JSON payload and scans catalog', async () => {
    const newProduct = {
      id: 'test-import-prod-1',
      name: 'Test Ergonomic Mechanical Keyboard',
      sku: 'KEY-TEST-99',
      price: '129.99',
      regular_price: '149.99',
      description: '', // intentionally empty to trigger catalog issue
      categories: ['Electronics', 'Accessories'],
    };

    const res = await request(app)
      .post('/api/import-export/import')
      .send({ products: [newProduct] });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.imported_count).toBe(1);
    importedProductId = newProduct.id;
  });

  // 2. Catalog Audit for the imported product
  it('scans the imported product and detects missing description', async () => {
    const res = await request(app)
      .post('/api/catalog-doctor/scan')
      .send({ product_id: importedProductId });

    expect(res.status).toBe(200);
    expect(res.body.issues).toBeDefined();
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.healthScore).toBeDefined();

    const descIssue = res.body.issues.find(
      (i: any) => i.rule_id === 'content.description.missing' || i.issue_type === 'content',
    );
    expect(descIssue).toBeDefined();
    expect(descIssue.severity).toBe('critical');
  });

  // 3. Validation Agent catches unsupported claims and invalid field lengths
  it('validation agent detects unsupported claims and flags high risk', async () => {
    const suspiciousProposal: EnrichmentOutput = {
      product_id: importedProductId,
      field_name: 'description',
      proposed_value:
        'This is the world best FDA certified keyboard with lifetime warranty that works with all devices unconditionally.',
      reason: 'Generated copy',
      evidence: {},
      confidence: 0.9,
      warnings: [],
      is_demo: false,
    };

    const dummyProduct = {
      id: importedProductId,
      name: 'Test Ergonomic Mechanical Keyboard',
      description: '',
    };

    const validationResult = await runValidationAgent(
      {
        proposal: suspiciousProposal,
        product: dummyProduct as any,
      },
      'task-test-val-1',
    );

    expect(validationResult.unsupported_claims.length).toBeGreaterThan(0);
    expect(validationResult.risk_level).toBe('high');
    expect(validationResult.status).toBe('needs_review');
  });

  // 4. Approval Gate Enforcement
  it('enforces backend approval gate: cannot approve an already rejected or nonexistent proposal', async () => {
    // Nonexistent approval
    const fakeRes = await request(app)
      .post('/api/approvals/nonexistent-id/approve')
      .send({ comment: 'looks good' });
    expect(fakeRes.status).toBe(404);

    // Rejection validation: requires comment
    const listRes = await request(app).get('/api/approvals?status=pending');
    expect(listRes.status).toBe(200);

    if (listRes.body.data.length > 0) {
      const pendingApproval = listRes.body.data[0];

      // Empty comment rejection should fail validation
      const rejectEmpty = await request(app)
        .post(`/api/approvals/${pendingApproval.id}/reject`)
        .send({ comment: '' });
      expect(rejectEmpty.status).toBe(400);

      // Successful rejection
      const rejectSuccess = await request(app)
        .post(`/api/approvals/${pendingApproval.id}/reject`)
        .send({ comment: 'Content does not match brand voice' });
      expect(rejectSuccess.status).toBe(200);
      expect(rejectSuccess.body.status).toBe('rejected');

      // Attempting to approve an already-rejected proposal must be forbidden
      const approveRejected = await request(app)
        .post(`/api/approvals/${pendingApproval.id}/approve`)
        .send({ comment: 'trying to approve rejected' });
      expect(approveRejected.status).toBe(403);
    }
  });

  // 5. CSV and JSON Export
  it('exports catalog data to CSV and JSON formats', async () => {
    const csvRes = await request(app).get('/api/import-export/export?format=csv');
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('KEY-TEST-99');

    const jsonRes = await request(app).get('/api/import-export/export?format=json');
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(jsonRes.text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((p: any) => p.sku === 'KEY-TEST-99')).toBe(true);
  });

  // 6. Reports & Analytics Endpoints
  it('returns category completeness and issue trend aggregations', async () => {
    const catRes = await request(app).get('/api/reports/category-completeness');
    expect(catRes.status).toBe(200);
    expect(Array.isArray(catRes.body.categories)).toBe(true);

    const trendRes = await request(app).get('/api/reports/issue-trends');
    expect(trendRes.status).toBe(200);
    expect(trendRes.body.by_severity).toBeDefined();
    expect(trendRes.body.health_distribution).toBeDefined();

    const auditRes = await request(app).get('/api/reports/audit-log');
    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.data)).toBe(true);
  });
});
