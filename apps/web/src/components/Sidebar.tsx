import React from 'react';
import {
  LayoutDashboard,
  Package,
  Stethoscope,
  Bot,
  CheckSquare,
  BarChart3,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'doctor'
  | 'agents'
  | 'approvals'
  | 'reports'
  | 'sync'
  | 'integrations';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  openIssuesCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCopilot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  openIssuesCount,
  collapsed,
  onToggleCollapse,
  onOpenCopilot,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Product Catalog', icon: Package },
    {
      id: 'doctor' as NavTab,
      label: 'Catalog Doctor',
      icon: Stethoscope,
      badge: openIssuesCount > 0 ? openIssuesCount : undefined,
      badgeType: 'critical',
    },
    { id: 'agents' as NavTab, label: 'Agent Studio', icon: Bot },
    {
      id: 'approvals' as NavTab,
      label: 'Approval Gate',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeType: 'warning',
    },
    { id: 'reports' as NavTab, label: 'Reports & Audit', icon: BarChart3 },
    { id: 'sync' as NavTab, label: 'WooCommerce Sync', icon: RefreshCw },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Sliders },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        minWidth: collapsed ? '80px' : '260px',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        background: '#0a0f1d',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: collapsed ? '20px 12px' : '20px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)',
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  color: '#fff',
                }}
              >
                Catalog<span style={{ color: '#06B6D4' }}>Pilot</span>
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#64748B',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                AI PIM AUTOPILOT
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '16px 10px', flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '12px' : '10px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: '10px',
                    border: isActive
                      ? '1px solid rgba(124, 58, 237, 0.4)'
                      : '1px solid transparent',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(124, 58, 237, 0.22) 0%, rgba(124, 58, 237, 0.05) 100%)'
                      : 'transparent',
                    color: isActive ? '#fff' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? '#A78BFA' : '#94A3B8'}
                    style={{ flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`badge badge-${item.badgeType === 'critical' ? 'critical' : 'medium'}`}
                      style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge !== undefined && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.badgeType === 'critical' ? '#F43F5E' : '#F59E0B',
                      }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* AI Copilot Quick Launcher Button */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <button
          onClick={onOpenCopilot}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background:
              'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.35)',
            color: '#E0E7FF',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.35)';
          }}
        >
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          {!collapsed && <span>AI Catalog Copilot</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
