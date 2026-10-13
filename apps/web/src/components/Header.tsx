import React from 'react';
import { Play, Sparkles, RefreshCw, Zap, ShieldCheck, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  isDemoMode: boolean;
  wcConnected: boolean;
  scanning: boolean;
  onScanCatalog: () => void;
  onOpenCopilot: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isDemoMode,
  wcConnected,
  scanning,
  onScanCatalog,
  onOpenCopilot,
}) => {
  return (
    <header
      style={{
        padding: '16px 28px',
        background: 'rgba(11, 15, 25, 0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#F8FAFC',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Environment Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDemoMode ? (
            <span
              className="badge badge-demo"
              title="Demo Mode: Running with deterministic fixtures. No API key needed."
            >
              <Zap size={12} color="#FBBF24" />
              DEMO MODE
            </span>
          ) : (
            <span
              className="badge badge-success"
              title="Live AI Provider: Connected to Google Gemini 1.5"
            >
              <Sparkles size={12} color="#34D399" />
              GEMINI 1.5 LIVE
            </span>
          )}

          <span
            className={`badge ${wcConnected ? 'badge-success' : 'badge-info'}`}
            title="WooCommerce Store Integration"
          >
            <ShoppingCart size={12} />
            {wcConnected ? 'WC: CONNECTED' : 'WC: DEMO STORE'}
          </span>
        </div>

        {/* Action: Run Diagnostic Scan */}
        <button
          onClick={onScanCatalog}
          disabled={scanning}
          className="btn-secondary"
          style={{ padding: '7px 14px', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          <span>{scanning ? 'Scanning...' : 'Diagnose Catalog'}</span>
        </button>

        {/* Action: Ask Copilot */}
        <button
          onClick={onOpenCopilot}
          className="btn-primary"
          style={{ padding: '7px 14px', fontSize: '0.82rem' }}
        >
          <Sparkles size={14} />
          <span>Ask Copilot</span>
        </button>
      </div>
    </header>
  );
};
