import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Health
  getHealth: async () => {
    const res = await axios.get('/health');
    return res.data;
  },

  // Dashboard & Products
  getDashboard: async () => {
    const res = await api.get('/products/dashboard');
    return res.data;
  },
  getProducts: async (params?: Record<string, unknown>) => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  getProduct: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },
  updateProduct: async (id: string, updates: Record<string, unknown>) => {
    const res = await api.patch(`/products/${id}`, updates);
    return res.data;
  },
  getProductHealthScore: async (id: string) => {
    const res = await api.get(`/products/${id}/health-score`);
    return res.data;
  },

  // Catalog Doctor
  getIssues: async (params?: Record<string, unknown>) => {
    const res = await api.get('/catalog-doctor/issues', { params });
    return res.data;
  },
  getDoctorSummary: async () => {
    const res = await api.get('/catalog-doctor/summary');
    return res.data;
  },
  scanProduct: async (productId: string) => {
    const res = await api.post('/catalog-doctor/scan', { product_id: productId });
    return res.data;
  },
  scanAllProducts: async () => {
    const res = await api.post('/catalog-doctor/scan-all');
    return res.data;
  },
  updateIssueStatus: async (issueId: string, status: string) => {
    const res = await api.patch(`/catalog-doctor/issues/${issueId}/status`, { status });
    return res.data;
  },

  // Agent Multi-Agent Orchestration
  startWorkflow: async (productId: string, issueId?: string, fieldName?: string) => {
    const res = await api.post('/agents/run', {
      product_id: productId,
      issue_id: issueId,
      field_name: fieldName,
    });
    return res.data;
  },
  getAgentRuns: async (params?: Record<string, unknown>) => {
    const res = await api.get('/agents/runs', { params });
    return res.data;
  },
  getAgentRun: async (runId: string) => {
    const res = await api.get(`/agents/runs/${runId}`);
    return res.data;
  },

  // Human-in-the-Loop Approvals Gate
  getApprovals: async (status = 'pending') => {
    const res = await api.get('/approvals', { params: { status } });
    return res.data;
  },
  getApproval: async (id: string) => {
    const res = await api.get(`/approvals/${id}`);
    return res.data;
  },
  approveProposal: async (id: string, comment?: string) => {
    const res = await api.post(`/approvals/${id}/approve`, { comment });
    return res.data;
  },
  rejectProposal: async (id: string, comment: string) => {
    const res = await api.post(`/approvals/${id}/reject`, { comment });
    return res.data;
  },

  // Reports
  getCategoryCompleteness: async () => {
    const res = await api.get('/reports/category-completeness');
    return res.data;
  },
  getIssueTrends: async () => {
    const res = await api.get('/reports/issue-trends');
    return res.data;
  },
  getAuditLog: async (params?: Record<string, unknown>) => {
    const res = await api.get('/reports/audit-log', { params });
    return res.data;
  },

  // WooCommerce Sync
  getSyncStatus: async () => {
    const res = await api.get('/sync/status');
    return res.data;
  },
  getSyncJobs: async (limit = 25) => {
    const res = await api.get('/sync/jobs', { params: { limit } });
    return res.data;
  },
  syncProduct: async (productId: string) => {
    const res = await api.post(`/sync/product/${productId}`);
    return res.data;
  },
  syncAll: async () => {
    const res = await api.post('/sync/all');
    return res.data;
  },

  // Integrations
  getIntegrationStatus: async () => {
    const res = await api.get('/integration/status');
    return res.data;
  },
  testIntegration: async (target: 'woocommerce' | 'ai') => {
    const res = await api.post('/integration/test', { target });
    return res.data;
  },

  // AI Copilot
  askCopilot: async (message: string, productId?: string) => {
    const res = await api.post('/copilot/chat', { message, product_id: productId });
    return res.data;
  },
};
