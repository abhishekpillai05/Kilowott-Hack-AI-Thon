import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getApprovals('pending');
      setApprovals(res.data || []);
      if (res.data?.length > 0 && !selectedApproval) {
        setSelectedApproval(res.data[0]);
      } else if (res.data?.length === 0) {
        setSelectedApproval(null);
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setActionLoading(true);
    try {
      await apiClient.approveProposal(selectedApproval.id, comment);
      alert('Proposal approved and applied directly to catalog database!');
      setComment('');
      fetchApprovals();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    if (!comment.trim()) {
      alert('Please provide a rejection reason in the comment field.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.rejectProposal(selectedApproval.id, comment);
      alert('Proposal rejected.');
      setComment('');
      fetchApprovals();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Banner */}
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
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <CheckSquare size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
              Human-in-the-Loop Approval Gate
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Backend-enforced governance. No AI changes are written to the catalog or synced to
              WooCommerce without explicit merchant approval.
            </p>
          </div>
        </div>

        <button onClick={fetchApprovals} className="btn-secondary">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>
        {/* Left: Pending Queue */}
        <div
          className="glass-panel"
          style={{ padding: '16px', maxHeight: '650px', overflowY: 'auto' }}
        >
          <h3
            style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}
          >
            PENDING REVIEWS ({approvals.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                Loading...
              </div>
            ) : approvals.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#10B981' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Queue is Clear!</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  No pending proposals awaiting review.
                </div>
              </div>
            ) : (
              approvals.map((appr) => {
                const isSelected = selectedApproval?.id === appr.id;
                return (
                  <div
                    key={appr.id}
                    onClick={() => setSelectedApproval(appr)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: isSelected
                        ? 'rgba(124, 58, 237, 0.22)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected
                        ? '1px solid #7C3AED'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#F8FAFC' }}>
                        {appr.product_name}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {appr.field_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                      SKU: {appr.product_sku || 'N/A'} • Risk:{' '}
                      <strong style={{ color: appr.risk_level === 'low' ? '#10B981' : '#F59E0B' }}>
                        {appr.risk_level}
                      </strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Side-by-Side Diff & Actions */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {selectedApproval ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Review AI Proposal for:{' '}
                      <span style={{ color: '#06B6D4' }}>{selectedApproval.product_name}</span>
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                      Target Field:{' '}
                      <strong style={{ color: '#A78BFA' }}>{selectedApproval.field_name}</strong> •
                      Confidence:{' '}
                      <strong style={{ color: '#10B981' }}>
                        {Math.round((selectedApproval.confidence || 0.85) * 100)}%
                      </strong>
                    </div>
                  </div>

                  <span className="badge badge-demo">RISK: {selectedApproval.risk_level}</span>
                </div>
              </div>

              {/* AI Reasoning */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(124, 58, 237, 0.08)',
                  borderLeft: '4px solid #7C3AED',
                  color: '#DDD6FE',
                  fontSize: '0.86rem',
                }}
              >
                <strong>AI Reasoning:</strong> {selectedApproval.reason}
              </div>

              {/* Before vs After Side-by-Side Visual Diff */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Current Value (Before) */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#F87171',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CURRENT VALUE (BEFORE)
                  </div>
                  <div className="diff-del" style={{ minHeight: '120px', whiteSpace: 'pre-wrap' }}>
                    {selectedApproval.current_value || '<Empty / Missing>'}
                  </div>
                </div>

                {/* Proposed Value (After) */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#34D399',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    PROPOSED VALUE (AFTER)
                  </div>
                  <div className="diff-add" style={{ minHeight: '120px', whiteSpace: 'pre-wrap' }}>
                    {selectedApproval.proposed_value}
                  </div>
                </div>
              </div>

              {/* Reviewer Comment Field */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#94A3B8',
                    marginBottom: '6px',
                  }}
                >
                  Reviewer Notes / Audit Comment (Required for rejection):
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Verified keywords and accuracy. Approved for live store."
                  className="glass-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Decision Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '16px',
                }}
              >
                <button onClick={handleReject} disabled={actionLoading} className="btn-danger">
                  <XCircle size={16} /> Reject Proposal
                </button>

                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <CheckCircle2 size={16} /> Approve & Apply to Catalog
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Select a pending proposal to review the visual diff and sign off.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
