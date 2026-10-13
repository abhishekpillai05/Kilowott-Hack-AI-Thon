import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const IssueSeverityEnum = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export const IssueStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'ignored', 'wont_fix']);
export const IssueTypeEnum = z.enum([
  'description',
  'seo',
  'media',
  'attributes',
  'identifier',
  'price',
  'duplicate',
  'variant',
  'formatting',
  'category',
  'other',
]);

export const ValidationStatusEnum = z.enum(['pending', 'valid', 'invalid', 'needs_review']);
export const ApprovalStatusEnum = z.enum([
  'draft',
  'validating',
  'pending',
  'approved',
  'rejected',
  'applying',
  'verifying',
  'verified',
  'failed',
  'needs_review',
  'cancelled',
]);

export const AgentRunStatusEnum = z.enum([
  'queued',
  'auditing',
  'enriching',
  'validating',
  'awaiting_approval',
  'applying',
  'verifying',
  'completed',
  'failed',
  'cancelled',
  'needs_review',
  'rejected',
]);

export const AgentTypeEnum = z.enum([
  'orchestrator',
  'auditor',
  'enrichment',
  'validation',
  'sync_verification',
]);

export const AgentTaskStatusEnum = z.enum(['queued', 'running', 'completed', 'failed', 'skipped']);

export const SyncJobStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'retrying',
  'cancelled',
]);

export const ProductStatusEnum = z.enum(['publish', 'draft', 'private', 'pending', 'trash']);

// ─── Product ─────────────────────────────────────────────────────────────────

export const ProductImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional().default(''),
  name: z.string().optional().default(''),
  id: z.number().optional(),
});

export const ProductAttributeSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  options: z.array(z.string()),
  visible: z.boolean().optional().default(true),
  variation: z.boolean().optional().default(false),
});

export const ProductCategorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  slug: z.string().optional(),
});

export const ProductTagSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  slug: z.string().optional(),
});

export const ProductDimensionsSchema = z.object({
  length: z.string().optional().default(''),
  width: z.string().optional().default(''),
  height: z.string().optional().default(''),
});

export const ProductSchema = z.object({
  id: z.string(),
  wc_id: z.number().nullable().optional(),
  sku: z.string().optional().default(''),
  name: z.string().min(1),
  slug: z.string().optional().default(''),
  description: z.string().optional().default(''),
  short_description: z.string().optional().default(''),
  price: z.string().optional().default(''),
  regular_price: z.string().optional().default(''),
  sale_price: z.string().optional().default(''),
  status: ProductStatusEnum.optional().default('publish'),
  catalog_visibility: z.string().optional().default('visible'),
  featured: z.boolean().optional().default(false),
  categories: z.array(ProductCategorySchema).optional().default([]),
  tags: z.array(ProductTagSchema).optional().default([]),
  images: z.array(ProductImageSchema).optional().default([]),
  attributes: z.array(ProductAttributeSchema).optional().default([]),
  variations: z.array(z.string()).optional().default([]),
  meta_title: z.string().optional().default(''),
  meta_description: z.string().optional().default(''),
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional().default('instock'),
  stock_quantity: z.number().nullable().optional(),
  weight: z.string().optional().default(''),
  dimensions: ProductDimensionsSchema.optional().default({}),
  type: z.enum(['simple', 'variable', 'grouped', 'external']).optional().default('simple'),
  parent_id: z.string().nullable().optional(),
  health_score: z.number().min(0).max(100).optional().default(0),
  issues_count: z.number().optional().default(0),
  last_scanned_at: z.string().nullable().optional(),
  wc_synced_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  source: z.enum(['demo', 'woocommerce', 'import', 'manual']).optional().default('demo'),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductAttribute = z.infer<typeof ProductAttributeSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

// ─── Catalog Issue ────────────────────────────────────────────────────────────

export const CatalogIssueSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  issue_type: IssueTypeEnum,
  severity: IssueSeverityEnum,
  title: z.string(),
  description: z.string(),
  evidence: z.record(z.unknown()).optional().default({}),
  recommendation: z.string().optional().default(''),
  auto_fixable: z.boolean().optional().default(false),
  status: IssueStatusEnum.optional().default('open'),
  rule_id: z.string().optional(),
  detected_by: z.string().optional().default('catalog_doctor'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  resolved_at: z.string().nullable().optional(),
  // populated via join
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
});

export type CatalogIssue = z.infer<typeof CatalogIssueSchema>;
export type IssueSeverity = z.infer<typeof IssueSeverityEnum>;
export type IssueStatus = z.infer<typeof IssueStatusEnum>;
export type IssueType = z.infer<typeof IssueTypeEnum>;

// ─── AI Proposal ─────────────────────────────────────────────────────────────

export const AIProposalSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  issue_id: z.string().nullable().optional(),
  agent_run_id: z.string().nullable().optional(),
  field_name: z.string(),
  current_value: z.string().nullable().optional(),
  proposed_value: z.string(),
  reason: z.string(),
  evidence: z.record(z.unknown()).optional().default({}),
  confidence: z.number().min(0).max(1).optional().default(0.8),
  missing_evidence: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional().default([]),
  validation_status: ValidationStatusEnum.optional().default('pending'),
  validation_report: z.record(z.unknown()).optional().default({}),
  approval_status: ApprovalStatusEnum.optional().default('pending'),
  reviewer_id: z.string().nullable().optional(),
  reviewer_comment: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  applied_at: z.string().nullable().optional(),
  apply_result: z.record(z.unknown()).optional().default({}),
  verification_status: z
    .enum(['pending', 'verified', 'failed', 'partial'])
    .optional()
    .default('pending'),
  verification_report: z.record(z.unknown()).optional().default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // populated via join
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
});

export type AIProposal = z.infer<typeof AIProposalSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;
export type ValidationStatus = z.infer<typeof ValidationStatusEnum>;

// ─── Agent Run / Task ─────────────────────────────────────────────────────────

export const AgentTaskSchema = z.object({
  id: z.string(),
  run_id: z.string(),
  agent_type: AgentTypeEnum,
  status: AgentTaskStatusEnum,
  input_schema: z.record(z.unknown()).optional().default({}),
  output_schema: z.record(z.unknown()).optional().default({}),
  tool_calls: z.array(z.record(z.unknown())).optional().default([]),
  handoff_to: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  duration_ms: z.number().nullable().optional(),
  model_provider: z.string().nullable().optional(),
  is_demo: z.boolean().optional().default(false),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const AgentRunSchema = z.object({
  id: z.string(),
  type: z.enum(['full_audit', 'single_product', 'batch', 'copilot']),
  status: AgentRunStatusEnum,
  product_id: z.string().nullable().optional(),
  product_ids: z.array(z.string()).optional().default([]),
  input_data: z.record(z.unknown()).optional().default({}),
  output_data: z.record(z.unknown()).optional().default({}),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tasks: z.array(AgentTaskSchema).optional().default([]),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;
export type AgentTask = z.infer<typeof AgentTaskSchema>;
export type AgentType = z.infer<typeof AgentTypeEnum>;
export type AgentRunStatus = z.infer<typeof AgentRunStatusEnum>;

// ─── Approval ─────────────────────────────────────────────────────────────────

export const ApprovalSchema = z.object({
  id: z.string(),
  proposal_id: z.string(),
  product_id: z.string(),
  status: ApprovalStatusEnum,
  reviewer_comment: z.string().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  risk_level: z.enum(['low', 'medium', 'high']).optional().default('low'),
  before_snapshot: z.record(z.unknown()).optional().default({}),
  after_snapshot: z.record(z.unknown()).optional().default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // populated via join
  proposal: AIProposalSchema.optional(),
  product: ProductSchema.optional(),
});

export type Approval = z.infer<typeof ApprovalSchema>;

// ─── Audit Event ─────────────────────────────────────────────────────────────

export const AuditEventSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  actor: z.string(),
  product_id: z.string().nullable().optional(),
  proposal_id: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  field_name: z.string().nullable().optional(),
  previous_value: z.string().nullable().optional(),
  new_value: z.string().nullable().optional(),
  approval_status: z.string().nullable().optional(),
  sync_result: z.string().nullable().optional(),
  verification_result: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
  created_at: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ─── Sync Job ─────────────────────────────────────────────────────────────────

export const SyncJobSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  operation: z.enum(['push', 'pull', 'verify', 'delete']),
  status: SyncJobStatusEnum,
  wc_id: z.number().nullable().optional(),
  payload: z.record(z.unknown()).optional().default({}),
  response: z.record(z.unknown()).optional().default({}),
  error_message: z.string().nullable().optional(),
  retry_count: z.number().optional().default(0),
  max_retries: z.number().optional().default(3),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export type SyncJob = z.infer<typeof SyncJobSchema>;

// ─── Integration Config ───────────────────────────────────────────────────────

export const IntegrationConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['woocommerce']),
  site_url: z.string().nullable().optional(),
  status: z.enum(['connected', 'disconnected', 'error', 'demo']),
  last_tested_at: z.string().nullable().optional(),
  last_sync_at: z.string().nullable().optional(),
  product_count: z.number().optional().default(0),
  settings: z.record(z.unknown()).optional().default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

// ─── API responses ───────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export function paginatedResponse<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema,
  });
}

export type Pagination = z.infer<typeof PaginationSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── Dashboard / Reports ──────────────────────────────────────────────────────

export const DashboardMetricsSchema = z.object({
  totalProducts: z.number(),
  healthScore: z.number(),
  productsNeedingAttention: z.number(),
  openIssues: z.number(),
  criticalIssues: z.number(),
  missingDescriptions: z.number(),
  missingImages: z.number(),
  duplicateCandidates: z.number(),
  pendingProposals: z.number(),
  pendingApprovals: z.number(),
  appliedRepairs: z.number(),
  failedRepairs: z.number(),
  lastScanAt: z.string().nullable(),
  integrationStatus: z.string(),
  isDemo: z.boolean(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

// ─── Health Scoring ───────────────────────────────────────────────────────────

export const HealthScoreBreakdownSchema = z.object({
  total: z.number().min(0).max(100),
  description: z.number(),
  seo: z.number(),
  media: z.number(),
  attributes: z.number(),
  identifier: z.number(),
  price: z.number(),
  penalties: z.number(),
});

export type HealthScoreBreakdown = z.infer<typeof HealthScoreBreakdownSchema>;

// ─── Agent I/O schemas (typed handoffs) ───────────────────────────────────────

export const AuditorInputSchema = z.object({
  product_id: z.string(),
  force_rescan: z.boolean().optional(),
});

export const AuditorOutputSchema = z.object({
  product_id: z.string(),
  issues: z.array(CatalogIssueSchema),
  health_score: z.number(),
  scanned_at: z.string(),
});

export const EnrichmentInputSchema = z.object({
  product_id: z.string(),
  issue_id: z.string(),
  field_name: z.string(),
  current_value: z.string().nullable().optional(),
  evidence: z.record(z.unknown()).optional().default({}),
  is_demo: z.boolean().optional(),
});

export const EnrichmentOutputSchema = z.object({
  product_id: z.string(),
  issue_id: z.string(),
  field_name: z.string(),
  proposed_value: z.string(),
  reason: z.string(),
  evidence: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  missing_evidence: z.string().nullable().optional(),
  warnings: z.array(z.string()),
  model_used: z.string(),
  is_demo: z.boolean(),
});

export const ValidationInputSchema = z.object({
  proposal: EnrichmentOutputSchema,
  product: ProductSchema,
});

export const ValidationOutputSchema = z.object({
  is_valid: z.boolean(),
  status: ValidationStatusEnum,
  field_checks: z.array(
    z.object({
      field: z.string(),
      passed: z.boolean(),
      rule: z.string(),
      message: z.string(),
    }),
  ),
  unsupported_claims: z.array(z.string()).optional().default([]),
  risk_level: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
});

export const VerificationInputSchema = z.object({
  product_id: z.string(),
  wc_id: z.number().nullable().optional(),
  expected_changes: z.record(z.string()),
  approval_id: z.string(),
});

export const VerificationOutputSchema = z.object({
  result: z.enum(['verified', 'failed', 'partial', 'conflict']),
  field_results: z.array(
    z.object({
      field: z.string(),
      expected: z.string(),
      actual: z.string().nullable(),
      matched: z.boolean(),
    }),
  ),
  summary: z.string(),
  retrieved_at: z.string(),
});

export type AuditorInput = z.infer<typeof AuditorInputSchema>;
export type AuditorOutput = z.infer<typeof AuditorOutputSchema>;
export type EnrichmentInput = z.infer<typeof EnrichmentInputSchema>;
export type EnrichmentOutput = z.infer<typeof EnrichmentOutputSchema>;
export type ValidationInput = z.infer<typeof ValidationInputSchema>;
export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;
export type VerificationInput = z.infer<typeof VerificationInputSchema>;
export type VerificationOutput = z.infer<typeof VerificationOutputSchema>;
