import React, { useEffect, useState } from 'react';
import {
  Activity,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  TrendingUp,
  FileText,
  Sliders,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { NavTab } from '../components/Sidebar';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onTriggerAgentRun: (productId: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate, onTriggerAgentRun }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [urgentProducts, setUrgentProducts] = useState<any[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, productsRes, runsRes] = await Promise.all([
        apiClient.getDashboard(),
        apiClient.getProducts({ limit: 5, sort: 'health_score', order: 'asc', hasIssues: true }),
        apiClient.getAgentRuns({ limit: 5 }),
      ]);
      setMetrics(dashData);
      setUrgentProducts(productsRes.data || []);
      setRecentRuns(runsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <p>Loading catalog intelligence...</p>
      </div>
    );
  }

  const healthScore = metrics?.healthScore || 0;
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#F43F5E';
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Primary KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Health Score Card */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
              CATALOG HEALTH SCORE
            </span>
            <Activity size={18} color={getScoreColor(healthScore)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: getScoreColor(healthScore),
                letterSpacing: '-0.03em',
              }}
            >
              {healthScore}
            </span>
            <span style={{ color: '#64748B', fontSize: '1rem', fontWeight: 600 }}>/ 100</span>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                height: '6px',
                flex: 1,
                borderRadius: '3px',
                background: '#1E293B',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${healthScore}%`,
                  background: getScoreColor(healthScore),
                  borderRadius: '3px',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
              {healthScore >= 80 ? 'Optimal' : healthScore >= 60 ? 'Fair' : 'Action Required'}
            </span>
          </div>
        </div>

        {/* Total Products */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
              TOTAL PRODUCTS
            </span>
            <Package size={18} color="#06B6D4" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#F8FAFC' }}>
              {metrics?.totalProducts || 0}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '8px' }}>
            {metrics?.productsNeedingAttention || 0} products need quality fixes
          </p>
        </div>

        {/* Open Catalog Issues */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
              ACTIVE ISSUES
            </span>
            <AlertTriangle size={18} color="#F43F5E" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FDA4AF' }}>
              {metrics?.openIssues || 0}
            </span>
            {metrics?.criticalIssues > 0 && (
              <span className="badge badge-critical">{metrics.criticalIssues} CRITICAL</span>
            )}
          </div>
          <button
            onClick={() => onNavigate('doctor')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '10px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Open Catalog Doctor <ArrowRight size={14} />
          </button>
        </div>

        {/* Pending Approvals Gate */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
              APPROVAL GATE
            </span>
            <CheckCircle2 size={18} color="#A78BFA" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#DDD6FE' }}>
              {metrics?.pendingApprovals || 0}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              Awaiting merchant sign-off
            </span>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A78BFA',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '10px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Review Pending Diffs <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Hero Interactive Benchmark Banner: Demo Target */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background:
            'linear-gradient(135deg, rgba(124, 58, 237, 0.16) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-demo">PRIMARY DEMO TARGET</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
              ProStand Aluminum Laptop Stand (prod-repair-demo)
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '6px', maxWidth: '650px' }}>
            This product is currently deficient (Health Score 32/100, missing SEO meta description,
            weak body copy, no alt text). Trigger the autonomous 4-agent workflow to audit, enrich,
            validate, and queue it for your sign-off!
          </p>
        </div>
        <button
          onClick={() => onTriggerAgentRun('prod-repair-demo')}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.92rem' }}
        >
          <Sparkles size={16} />
          Launch 4-Agent Auto-Repair
        </button>
      </div>

      {/* Two Column Section: Products Needing Attention & Agent Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Products Table */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
              Products Needing Urgent Fixes
            </h3>
            <button
              onClick={() => onNavigate('products')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {urgentProducts.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No deficient products found!</p>
            ) : (
              urgentProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#F8FAFC',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                      SKU: <span style={{ color: '#94A3B8' }}>{p.sku || 'MISSING'}</span> • Issues:{' '}
                      <span style={{ color: '#F43F5E' }}>{p.issues_count}</span>
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
                  >
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: getScoreColor(p.health_score) + '22',
                        color: getScoreColor(p.health_score),
                      }}
                    >
                      {p.health_score}/100
                    </span>
                    <button
                      onClick={() => onTriggerAgentRun(p.id)}
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      title="Run AI Repair"
                    >
                      <Sparkles size={12} color="#06B6D4" /> Fix
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Agent Runs */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
              Multi-Agent Orchestrator Runs
            </h3>
            <button
              onClick={() => onNavigate('agents')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Agent Studio
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentRuns.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '0.85rem',
                }}
              >
                <Bot size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                No agent runs yet. Trigger one from the button above!
              </div>
            ) : (
              recentRuns.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F8FAFC' }}>
                      Run:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#A78BFA' }}>
                        {r.id.slice(0, 14)}...
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                      Target: {r.product_id || 'Catalog Batch'} • Tasks: {r.task_count || 4}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      r.status === 'completed'
                        ? 'badge-success'
                        : r.status === 'awaiting_approval'
                          ? 'badge-medium'
                          : r.status === 'failed'
                            ? 'badge-critical'
                            : 'badge-info'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
