import React, { useEffect, useState, useCallback } from 'react';
import './index.css';
import { Sidebar, type NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { CopilotDrawer } from './components/CopilotDrawer';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CatalogDoctorPage } from './pages/CatalogDoctorPage';
import { AgentsPage } from './pages/AgentsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SyncPage } from './pages/SyncPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { apiClient } from './api/client';

function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  // App-wide state from API
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [wcConnected, setWcConnected] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);

  // Agent Studio: allow any page to trigger a workflow, auto-navigate to agents
  const [agentTargetProductId, setAgentTargetProductId] = useState<string | undefined>();

  // Load global status on mount
  useEffect(() => {
    (async () => {
      try {
        const [health, dashboard, approvals] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getDashboard(),
          apiClient.getApprovals('pending'),
        ]);
        setIsDemoMode(health.ai?.demo_mode ?? true);
        setWcConnected(health.woocommerce?.mode === 'live');
        setPendingApprovalsCount(approvals.pagination?.total ?? 0);
        setOpenIssuesCount(dashboard.openIssues ?? 0);
      } catch (err) {
        console.warn('Could not load global app status — API may be starting up.');
      }
    })();
  }, []);

  // Periodically refresh badge counts (every 10s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [dashboard, approvals] = await Promise.all([
          apiClient.getDashboard(),
          apiClient.getApprovals('pending'),
        ]);
        setPendingApprovalsCount(approvals.pagination?.total ?? 0);
        setOpenIssuesCount(dashboard.openIssues ?? 0);
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleScanCatalog = async () => {
    setScanning(true);
    try {
      const res = await apiClient.scanAllProducts();
      setOpenIssuesCount(res.total_issues ?? 0);
      alert(
        `✅ Diagnostic scan complete! Scanned ${res.total_products} products — ${res.total_issues} active issues detected.`,
      );
    } catch (err: any) {
      alert(`Scan failed: ${err.message || 'API unreachable'}`);
    } finally {
      setScanning(false);
    }
  };

  const handleTriggerAgentRun = useCallback(async (productId: string, issueId?: string) => {
    try {
      const res = await apiClient.startWorkflow(productId, issueId);
      setAgentTargetProductId(productId);
      setCurrentTab('agents');
      alert(
        `🤖 Multi-agent workflow started (Run ID: ${res.run_id})\n\nNavigating to Agent Studio to track execution...`,
      );
    } catch (err: any) {
      alert(`Failed to start agent workflow: ${err.message}`);
    }
  }, []);

  const getPageTitle = (): { title: string; subtitle: string } => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Catalog Intelligence Dashboard',
          subtitle: 'Real-time PIM health metrics and autonomous agent activity',
        };
      case 'products':
        return {
          title: 'Product Catalog',
          subtitle: 'Browse, edit, and trigger AI repair for any product',
        };
      case 'doctor':
        return {
          title: 'Autonomous Catalog Doctor',
          subtitle: '12-rule diagnostic engine — detecting and classifying quality issues',
        };
      case 'agents':
        return {
          title: 'Multi-Agent Orchestrator Studio',
          subtitle: '4-node agentic pipeline: Auditor → Enrichment → Validation → Verification',
        };
      case 'approvals':
        return {
          title: 'Human-in-the-Loop Approval Gate',
          subtitle: 'Backend-enforced governance — no AI changes apply without merchant sign-off',
        };
      case 'reports':
        return {
          title: 'Analytics & Audit Trail',
          subtitle: 'Category completeness, health distributions, and tamper-evident audit log',
        };
      case 'sync':
        return {
          title: 'WooCommerce Synchronization',
          subtitle: 'Push approved catalog changes directly to your live store',
        };
      case 'integrations':
        return {
          title: 'Integration Settings',
          subtitle: 'Configure WooCommerce REST API and Google Gemini AI connectivity',
        };
      default:
        return { title: 'CatalogPilot AI', subtitle: '' };
    }
  };

  const { title, subtitle } = getPageTitle();

  const renderPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage onNavigate={setCurrentTab} onTriggerAgentRun={handleTriggerAgentRun} />
        );
      case 'products':
        return <ProductsPage onTriggerAgentRun={handleTriggerAgentRun} />;
      case 'doctor':
        return <CatalogDoctorPage onTriggerAgentRun={handleTriggerAgentRun} />;
      case 'agents':
        return <AgentsPage initialProductId={agentTargetProductId} />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'sync':
        return <SyncPage />;
      case 'integrations':
        return <IntegrationsPage />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
        openIssuesCount={openIssuesCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        {/* Sticky Header */}
        <Header
          title={title}
          subtitle={subtitle}
          isDemoMode={isDemoMode}
          wcConnected={wcConnected}
          scanning={scanning}
          onScanCatalog={handleScanCatalog}
          onOpenCopilot={() => setCopilotOpen(true)}
        />

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>{renderPage()}</main>
      </div>

      {/* AI Copilot Drawer Overlay */}
      <CopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}

export default App;
