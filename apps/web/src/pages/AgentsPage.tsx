import React, { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Code,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface AgentsPageProps {
  initialProductId?: string;
}

export const AgentsPage: React.FC<AgentsPageProps> = ({ initialProductId }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [productIdInput, setProductIdInput] = useState(initialProductId || 'prod-repair-demo');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAgentRuns({ limit: 20 });
      setRuns(res.data || []);
      if (res.data?.length > 0 && !selectedRun) {
        // Load details for first run
        const detail = await apiClient.getAgentRun(res.data[0].id);
        setSelectedRun(detail);
      }
    } catch (err) {
      console.error('Error fetching agent runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleStartRun = async () => {
    if (!productIdInput.trim()) return;
    setStarting(true);
    try {
      const res = await apiClient.startWorkflow(productIdInput.trim());
      alert(`Workflow started (Run ID: ${res.run_id})! Inspecting execution pipeline...`);
      // Wait 1 second and fetch
      setTimeout(async () => {
        const detail = await apiClient.getAgentRun(res.run_id);
        setSelectedRun(detail);
        fetchRuns();
      }, 1000);
    } catch (err: any) {
      alert(`Workflow start failed: ${err.message}`);
    } finally {
      setStarting(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const detail = await apiClient.getAgentRun(runId);
      setSelectedRun(detail);
    } catch (err) {
      console.error('Error loading run details:', err);
    }
  };

  const agentSteps = [
    { name: 'Auditor Agent', role: 'Diagnostic Rule Evaluation', icon: '🔍', color: '#38BDF8' },
    {
      name: 'Enrichment Agent',
      role: 'AI Generation & Evidence Grounding',
      icon: '✍️',
      color: '#A78BFA',
    },
    {
      name: 'Validation Agent',
      role: 'Claim Validation & Risk Scoring',
      icon: '⚖️',
      color: '#FCD34D',
    },
    {
      name: 'Verification Agent',
      role: 'Post-Apply Independent Audit',
      icon: '🛡️',
      color: '#34D399',
    },
  ];

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Visual Multi-Agent Architecture Pipeline Diagram */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
              Multi-Agent Orchestrator Architecture
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Four specialized, deterministic agent nodes collaborate with formal schema validation
              and backend-enforced approval gating.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            position: 'relative',
          }}
        >
          {agentSteps.map((agent, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${agent.color}33`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{agent.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                  {agent.name}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{agent.role}</p>
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: agent.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Node #{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Launcher Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}
        >
          <label style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
            Target Product ID:
          </label>
          <input
            type="text"
            value={productIdInput}
            onChange={(e) => setProductIdInput(e.target.value)}
            placeholder="e.g. prod-repair-demo, prod-002"
            className="glass-input"
            style={{ width: '220px' }}
          />
          <button
            onClick={() => setProductIdInput('prod-repair-demo')}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Demo Target
          </button>
        </div>

        <button
          onClick={handleStartRun}
          disabled={starting || !productIdInput.trim()}
          className="btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <Play size={15} />
          <span>{starting ? 'Starting Workflow...' : 'Execute Multi-Agent Workflow'}</span>
        </button>
      </div>

      {/* Run Inspector: Left list, Right Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left: Runs List */}
        <div
          className="glass-panel"
          style={{ padding: '16px', maxHeight: '600px', overflowY: 'auto' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
              RUN HISTORY
            </span>
            <button
              onClick={fetchRuns}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {runs.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.82rem' }}>No runs logged yet.</p>
            ) : (
              runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRun(r.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: isSelected
                        ? 'rgba(124, 58, 237, 0.2)'
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
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          color: '#DDD6FE',
                        }}
                      >
                        {r.id.slice(0, 16)}...
                      </span>
                      <span
                        className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-demo'}`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                      Target: {r.product_id}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Run Detail with Task Inspector */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {selectedRun ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Run:{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#A78BFA' }}>
                      {selectedRun.id}
                    </span>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                    Target Product:{' '}
                    <strong style={{ color: '#fff' }}>{selectedRun.product_id}</strong> • Created:{' '}
                    {new Date(selectedRun.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <span
                  className={`badge ${selectedRun.status === 'completed' ? 'badge-success' : 'badge-medium'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {selectedRun.status}
                </span>
              </div>

              {/* Tasks List */}
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#F8FAFC',
                  marginBottom: '12px',
                }}
              >
                Agent Tasks Execution Trace ({selectedRun.tasks?.length || 0})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedRun.tasks?.map((task: any) => {
                  const isExpanded = expandedTask === task.id;
                  return (
                    <div
                      key={task.id}
                      style={{
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Bot size={18} color="#A78BFA" />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '0.88rem',
                              color: '#F8FAFC',
                              textTransform: 'capitalize',
                            }}
                          >
                            {task.agent_type} Agent
                          </span>
                          {task.is_demo && (
                            <span className="badge badge-demo" style={{ fontSize: '0.65rem' }}>
                              DEMO
                            </span>
                          )}
                          {task.duration_ms && (
                            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              ({task.duration_ms} ms)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-info'}`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {task.status}
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            padding: '14px 16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            background: '#0a0e1a',
                          }}
                        >
                          {/* Tool Calls */}
                          {task.tool_calls?.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#38BDF8',
                                  marginBottom: '4px',
                                }}
                              >
                                TOOL CALLS EXECUTED:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {task.tool_calls.map((tc: any, idx: number) => (
                                  <span
                                    key={idx}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      background: 'rgba(56, 189, 248, 0.1)',
                                      color: '#7DD3FC',
                                      fontSize: '0.72rem',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    {tc.tool || tc.name || JSON.stringify(tc)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Output Schema */}
                          <div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#A78BFA',
                                marginBottom: '4px',
                              }}
                            >
                              OUTPUT PAYLOAD:
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                padding: '10px',
                                borderRadius: '6px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                color: '#CBD5E1',
                                fontSize: '0.75rem',
                                fontFamily: 'var(--font-mono)',
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(task.output_schema, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Select a run from the history to view its multi-agent trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
