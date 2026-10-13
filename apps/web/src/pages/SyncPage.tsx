import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { api, apiClient } from '../api/client';

export const SyncPage: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchSyncing, setBatchSyncing] = useState(false);

  const loadSyncData = async () => {
    setLoading(true);
    try {
      const [statusRes, jobsRes] = await Promise.all([
        apiClient.getSyncStatus(),
        apiClient.getSyncJobs(25),
      ]);
      setSyncStatus(statusRes);
      setSyncJobs(jobsRes.data || []);
    } catch (err) {
      console.error('Failed to load sync data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, []);

  const handleBatchSync = async () => {
    setBatchSyncing(true);
    try {
      const res = await apiClient.syncAll();
      alert(`Batch sync completed! ${res.message}`);
      loadSyncData();
    } catch (err: any) {
      alert(`Batch sync failed: ${err.message}`);
    } finally {
      setBatchSyncing(false);
    }
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Banner */}
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
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
              WooCommerce Store Synchronization
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Seamless bi-directional synchronization with WooCommerce REST API, featuring schema
              mapping and idempotency safeguards.
            </p>
          </div>
        </div>

        <button
          onClick={handleBatchSync}
          disabled={batchSyncing}
          className="btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <RefreshCw size={15} className={batchSyncing ? 'animate-spin' : ''} />
          <span>{batchSyncing ? 'Syncing Catalog...' : 'Sync Entire Catalog to Store'}</span>
        </button>
      </div>

      {/* Sync Status KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>STORE STATUS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC', marginTop: '8px' }}>
            {syncStatus?.mode === 'live' ? 'Live Connected' : 'Demo Mode Adapter'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
            {syncStatus?.site_url}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
            SYNCED PRODUCTS
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10B981', marginTop: '8px' }}>
            {syncStatus?.synced_products || 0} / {syncStatus?.total_products || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
            Products with verified sync timestamp
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
            COMPLETED JOBS
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38BDF8', marginTop: '8px' }}>
            {syncStatus?.completed_jobs || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
            Successful write operations
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
            LAST SYNC TIME
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DDD6FE', marginTop: '8px' }}>
            {syncStatus?.last_sync_at
              ? new Date(syncStatus.last_sync_at).toLocaleTimeString()
              : 'Never'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
            Automated sync scheduler active
          </div>
        </div>
      </div>

      {/* Sync Jobs Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
            Sync Operations Log
          </h3>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.86rem',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <th style={{ padding: '12px 20px', color: '#94A3B8', fontWeight: 600 }}>JOB ID</th>
              <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600 }}>OPERATION</th>
              <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600 }}>STATUS</th>
              <th
                style={{
                  padding: '12px 20px',
                  color: '#94A3B8',
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                TIMESTAMP
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                  Loading sync history...
                </td>
              </tr>
            ) : syncJobs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                  No sync operations logged yet. Click "Sync Entire Catalog to Store" above!
                </td>
              </tr>
            ) : (
              syncJobs.map((j) => (
                <tr key={j.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td
                    style={{
                      padding: '12px 20px',
                      fontFamily: 'var(--font-mono)',
                      color: '#A78BFA',
                      fontSize: '0.8rem',
                    }}
                  >
                    {j.id}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#F8FAFC', fontWeight: 600 }}>
                    {j.product_name || j.product_id}
                  </td>
                  <td
                    style={{ padding: '12px 16px', color: '#94A3B8', textTransform: 'capitalize' }}
                  >
                    {j.operation}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className={`badge ${j.status === 'completed' ? 'badge-success' : 'badge-critical'}`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      color: '#64748B',
                      fontSize: '0.78rem',
                    }}
                  >
                    {new Date(j.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
