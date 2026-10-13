import React, { useEffect, useState } from 'react';
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  Filter,
  Check,
  Eye,
  Info,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface CatalogDoctorPageProps {
  onTriggerAgentRun: (productId: string, issueId?: string) => void;
}

export const CatalogDoctorPage: React.FC<CatalogDoctorPageProps> = ({ onTriggerAgentRun }) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 50 };
      if (severityFilter !== 'all') params.severity = severityFilter;

      const [issuesRes, sumRes] = await Promise.all([
        apiClient.getIssues(params),
        apiClient.getDoctorSummary(),
      ]);

      setIssues(issuesRes.data || []);
      setSummary(sumRes);
    } catch (err) {
      console.error('Failed to load doctor issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [severityFilter]);

  const handleScanCatalog = async () => {
    setScanning(true);
    try {
      const res = await apiClient.scanAllProducts();
      alert(
        `Diagnostic scan completed! Scanned ${res.total_products} products. Detected ${res.total_issues} issues.`,
      );
      loadIssues();
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      await apiClient.updateIssueStatus(issueId, status);
      loadIssues();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-info';
    }
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner & Scan Action */}
      <div
        className="glass-panel"
        style={{
          padding: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F43F5E 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
              Autonomous Catalog Doctor
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Continuous diagnostic engine executing 12 semantic and schema validation rules across
              your entire catalog.
            </p>
          </div>
        </div>

        <button
          onClick={handleScanCatalog}
          disabled={scanning}
          className="btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          <span>{scanning ? 'Running Full Diagnostic...' : 'Execute Diagnostic Scan'}</span>
        </button>
      </div>

      {/* Severity Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={severityFilter === sev ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              textTransform: 'capitalize',
            }}
          >
            {sev === 'all' ? 'All Severities' : `${sev}`}
          </button>
        ))}
      </div>

      {/* Issues Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
            Loading catalog issues...
          </div>
        ) : issues.length === 0 ? (
          <div
            className="glass-panel"
            style={{ padding: '40px', textAlign: 'center', color: '#10B981' }}
          >
            <CheckCircle size={36} style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>
              No Open Issues Found!
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '4px' }}>
              All products meet the diagnostic quality thresholds for this filter.
            </p>
          </div>
        ) : (
          issues.map((iss) => (
            <div
              key={iss.id}
              className="glass-panel"
              style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <span className={`badge ${getSeverityBadgeClass(iss.severity)}`}>
                    {iss.severity}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Rule: {iss.rule_id}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    • Target: <strong style={{ color: '#fff' }}>{iss.product_name}</strong> (
                    {iss.product_sku || 'No SKU'})
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#F8FAFC',
                    marginBottom: '4px',
                  }}
                >
                  {iss.title}
                </h4>
                <p style={{ fontSize: '0.86rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                  {iss.description}
                </p>

                {iss.recommendation && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.08)',
                      borderLeft: '3px solid #06B6D4',
                      fontSize: '0.82rem',
                      color: '#67E8F9',
                    }}
                  >
                    <strong>Recommendation:</strong> {iss.recommendation}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {iss.auto_fixable && (
                  <button
                    onClick={() => onTriggerAgentRun(iss.product_id, iss.id)}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                  >
                    <Sparkles size={14} /> Auto-Fix via Agent
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus(iss.id, 'resolved')}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                  title="Mark as resolved manually"
                >
                  <Check size={14} /> Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
