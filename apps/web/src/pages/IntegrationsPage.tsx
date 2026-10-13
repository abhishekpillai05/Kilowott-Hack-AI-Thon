import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShoppingCart,
  TestTube,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const IntegrationsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<'woocommerce' | 'ai' | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [showKey, setShowKey] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getIntegrationStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTest = async (target: 'woocommerce' | 'ai') => {
    setTesting(target);
    try {
      const res = await apiClient.testIntegration(target);
      setTestResults((prev) => ({ ...prev, [target]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [target]: { success: false, message: err.message } }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div
        className="glass-panel"
        style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Sliders size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
            Integration Configuration & Health
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
            Manage connections to WooCommerce and Google Gemini AI. Credentials are never stored
            in-memory plain text.
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {/* WooCommerce Integration Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShoppingCart size={24} color="#7C3AED" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>
                  WooCommerce REST API
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  v3 REST API endpoint integration
                </div>
              </div>
            </div>
            <span
              className={`badge ${status?.woocommerce?.mode === 'live' ? 'badge-success' : 'badge-demo'}`}
            >
              {status?.woocommerce?.mode === 'live' ? '● LIVE' : '◎ DEMO'}
            </span>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Site URL</span>
              <span
                style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
              >
                {status?.woocommerce?.site_url || 'Not configured'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Status</span>
              <span style={{ color: status?.woocommerce?.mode === 'live' ? '#10B981' : '#F59E0B' }}>
                {status?.woocommerce?.status || 'demo_mode'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Products in Catalog</span>
              <span style={{ color: '#F8FAFC', fontWeight: 600 }}>
                {status?.woocommerce?.product_count || 0}
              </span>
            </div>
          </div>

          {/* Test Result */}
          {testResults.woocommerce && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: testResults.woocommerce.success
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${testResults.woocommerce.success ? '#10B981' : '#F43F5E'}33`,
                fontSize: '0.82rem',
                color: testResults.woocommerce.success ? '#6EE7B7' : '#FDA4AF',
                marginBottom: '14px',
              }}
            >
              {testResults.woocommerce.message}
            </div>
          )}

          <button
            onClick={() => handleTest('woocommerce')}
            disabled={testing === 'woocommerce'}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <TestTube size={15} />
            {testing === 'woocommerce' ? 'Testing Connection...' : 'Test WooCommerce Connection'}
          </button>

          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.78rem',
              color: '#64748B',
            }}
          >
            To connect a live store, set <code style={{ color: '#06B6D4' }}>WC_SITE_URL</code>,{' '}
            <code style={{ color: '#06B6D4' }}>WC_CONSUMER_KEY</code>, and{' '}
            <code style={{ color: '#06B6D4' }}>WC_CONSUMER_SECRET</code> in{' '}
            <code style={{ color: '#A78BFA' }}>apps/api/.env</code> and restart the server.
          </div>
        </div>

        {/* Gemini AI Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={24} color="#06B6D4" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>
                  Google Gemini AI
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Multimodal Generative AI for catalog enrichment
                </div>
              </div>
            </div>
            <span
              className={`badge ${status?.ai?.mode === 'live' ? 'badge-success' : 'badge-demo'}`}
            >
              {status?.ai?.mode === 'live' ? '● LIVE AI' : '◎ DEMO FIXTURES'}
            </span>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Provider</span>
              <span style={{ color: '#F8FAFC' }}>Google Gemini</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>Model</span>
              <span
                style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
              >
                {status?.ai?.model || 'gemini-1.5-flash'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94A3B8' }}>API Key Status</span>
              <span style={{ color: status?.ai?.key_configured ? '#10B981' : '#F59E0B' }}>
                {status?.ai?.key_configured ? 'Configured & Active' : 'Not Set (Demo Mode)'}
              </span>
            </div>
          </div>

          {/* Test Result */}
          {testResults.ai && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: testResults.ai.success
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${testResults.ai.success ? '#10B981' : '#F43F5E'}33`,
                fontSize: '0.82rem',
                color: testResults.ai.success ? '#6EE7B7' : '#FDA4AF',
                marginBottom: '14px',
              }}
            >
              {testResults.ai.message}
            </div>
          )}

          <button
            onClick={() => handleTest('ai')}
            disabled={testing === 'ai'}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Sparkles size={15} />
            {testing === 'ai' ? 'Testing AI Provider...' : 'Test Gemini AI Connection'}
          </button>

          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.78rem',
              color: '#64748B',
            }}
          >
            Set <code style={{ color: '#06B6D4' }}>GOOGLE_API_KEY</code> in{' '}
            <code style={{ color: '#A78BFA' }}>apps/api/.env</code> to enable live AI enrichment.
            Demo fixtures run without any API key.
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
          System Architecture
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            fontSize: '0.82rem',
          }}
        >
          {[
            { label: 'Backend', value: 'Express.js + TypeScript', color: '#38BDF8' },
            { label: 'Database', value: 'SQLite (WAL mode)', color: '#34D399' },
            { label: 'AI Engine', value: 'Google Gemini 1.5 Flash', color: '#A78BFA' },
            { label: 'Frontend', value: 'React 19 + Vite 6', color: '#F472B6' },
            { label: 'Orchestration', value: '4-Agent State Machine', color: '#FCD34D' },
            { label: 'Validation', value: 'Zod Schema Schemas', color: '#FB923C' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div
                style={{
                  color: '#64748B',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </div>
              <div style={{ color: item.color, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
