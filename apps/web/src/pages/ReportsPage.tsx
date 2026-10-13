import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  RefreshCw,
  FolderTree,
  History,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const ReportsPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [issueTrends, setIssueTrends] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [catRes, trendRes, auditRes] = await Promise.all([
        apiClient.getCategoryCompleteness(),
        apiClient.getIssueTrends(),
        apiClient.getAuditLog({ limit: 20 }),
      ]);
      setCategories(catRes.categories || []);
      setIssueTrends(trendRes);
      setAuditEvents(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner & Exports */}
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
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
              Catalog Quality Analytics & Audit Trail
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Real-time completeness by category, health score distributions, and tamper-evident
              audit history.
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/api/import-export/export?format=csv"
            download="catalogpilot-export.csv"
            className="btn-secondary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} color="#10B981" />
            <span>Export CSV</span>
          </a>
          <a
            href="/api/import-export/export?format=json"
            download="catalogpilot-export.json"
            className="btn-secondary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCode size={15} color="#06B6D4" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Category Completeness Breakdown Grid */}
      <div>
        <h3
          style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}
        >
          Completeness & Quality by Category
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {categories.map((cat, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '18px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>
                  {cat.category}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    background:
                      cat.completeness_grade === 'A'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color: cat.completeness_grade === 'A' ? '#6EE7B7' : '#FCD34D',
                  }}
                >
                  Grade {cat.completeness_grade}
                </span>
              </div>

              <div
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.82rem',
                  color: '#94A3B8',
                }}
              >
                <div>
                  Products: <strong style={{ color: '#fff' }}>{cat.product_count}</strong>
                </div>
                <div>
                  Avg Health Score:{' '}
                  <strong style={{ color: '#fff' }}>{cat.avg_health_score}/100</strong>
                </div>
                <div>
                  Open Issues: <strong style={{ color: '#F43F5E' }}>{cat.total_issues}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#A78BFA" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
              Catalog Modification Audit Trail
            </h3>
          </div>
          <button
            onClick={loadReports}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditEvents.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '0.82rem' }}>No audit events logged yet.</p>
          ) : (
            auditEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#06B6D4' }}>
                      {ev.event_type}
                    </span>
                    {ev.product_name && (
                      <span style={{ color: '#CBD5E1' }}> on {ev.product_name}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                    Actor: <span style={{ color: '#94A3B8' }}>{ev.actor}</span> •{' '}
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>

                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                  VERIFIED
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
