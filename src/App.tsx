import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { NewOrderMessenger } from './components/orders/NewOrderMessenger';
import { WalkInPOS } from './components/orders/WalkInPOS';
import { TodaysOrdersView } from './components/orders/TodaysOrdersView';
import { AllOrdersView } from './components/orders/AllOrdersView';
import { CancelledOrdersView } from './components/orders/CancelledOrdersView';
import { PreOrdersView } from './components/orders/PreOrdersView';
import { ScheduledOrdersView } from './components/orders/ScheduledOrdersView';
import { OrdersList } from './components/orders/OrdersList';
import { PackingView } from './components/packing/PackingView';
import { PackagingMaterialsView } from './components/operations/PackagingMaterialsView';
import { CourierBookingsView } from './components/courier/CourierBookingsView';
import { ProductsView } from './components/inventory/ProductsView';
import { BatchesView } from './components/inventory/BatchesView';
import { StockLedgerView } from './components/inventory/StockLedgerView';
import { ReservationsView } from './components/inventory/ReservationsView';
import { StockTransferView } from './components/inventory/StockTransferView';
import { FragranceNotesView } from './components/inventory/FragranceNotesView';
import { SuppliersView } from './components/purchasing/SuppliersView';
import { PurchaseOrdersView } from './components/purchasing/PurchaseOrdersView';
import { PurchaseReturnsView } from './components/purchasing/PurchaseReturnsView';
import { CustomerReturnsView } from './components/returns/CustomerReturnsView';
import { CustomersView } from './components/customers/CustomersView';
import { JournalView } from './components/accounting/JournalView';
import { DailyCashTillView } from './components/accounting/DailyCashTillView';
import { ExpensesView } from './components/accounting/ExpensesView';
import { PayrollView } from './components/accounting/PayrollView';
import { FinancialReportsView } from './components/accounting/FinancialReportsView';
import { PrintReportsView } from './components/dashboard/PrintReportsView';
import { DynamicPricingView } from './components/pricing/DynamicPricingView';
import { UsersView } from './components/settings/UsersView';
import { AuditLogView } from './components/audit/AuditLogView';
import { SettingsView } from './components/settings/SettingsView';
import { SystemSecurityView } from './components/settings/SystemSecurityView';
import { HRManagementView } from './components/hr/HRManagementView';
import { LoginView } from './components/auth/LoginView';
import { IncomeView } from './components/accounting/IncomeView';
import { PaymentsView } from './components/accounting/PaymentsView';
import { PayableReceivableView } from './components/accounting/PayableReceivableView';
import { ReconciliationView } from './components/accounting/ReconciliationView';
import { CRMManagementView } from './components/crm/CRMManagementView';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { activePath, setActivePath, isInitialized, sidebarOpen, setSidebarOpen } = useApp();
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setActivePath('/orders/new');
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setActivePath('/orders/walk-in');
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          setActivePath('/orders');
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setActivePath('/dashboard');
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setActivePath('/inventory/products');
        } else if (e.key === '/') {
          e.preventDefault();
          setShowShortcutsModal(prev => !prev);
        }
      } else if (!isInput) {
        if (e.key === '?') {
          e.preventDefault();
          setShowShortcutsModal(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePath]);

  const renderActiveView = () => {
    switch (activePath) {
      case '/dashboard':
        return <DashboardView />;
      case '/orders/new':
        return <NewOrderMessenger />;
      case '/orders/walk-in':
        return <WalkInPOS />;
      case '/orders/today':
        return <TodaysOrdersView />;
      case '/orders/scheduled':
        return <ScheduledOrdersView />;
      case '/orders/pre-orders':
        return <PreOrdersView />;
      case '/orders':
        return <AllOrdersView />;
      case '/orders/cancelled':
        return <CancelledOrdersView />;
      case '/orders/returns':
      case '/courier/rto':
      case '/returns':
        return <CustomerReturnsView />;
      case '/packing':
        return <PackingView />;
      case '/operations/packaging':
        return <PackagingMaterialsView />;
      case '/courier':
      case '/courier/bookings':
      case '/courier/tracking':
      case '/courier/reconciliation':
        return <CourierBookingsView />;
      case '/inventory':
      case '/inventory/products':
        return <ProductsView />;
      case '/inventory/batches':
        return <BatchesView />;
      case '/inventory/movements':
      case '/inventory/ledger':
      case '/inventory/testers':
        return <StockLedgerView />;
      case '/inventory/reservations':
        return <ReservationsView />;
      case '/inventory/transfer':
        return <StockTransferView />;
      case '/inventory/fragrance-notes':
        return <FragranceNotesView />;
      case '/purchasing/suppliers':
      case '/purchasing/reconciliation':
        return <SuppliersView />;
      case '/purchasing/orders':
      case '/purchasing/receive':
        return <PurchaseOrdersView />;
      case '/purchasing/returns':
        return <PurchaseReturnsView />;
      case '/customers':
        return <CustomersView />;
      case '/accounting/ledger':
        return <JournalView />;
      case '/accounting/income':
        return <IncomeView />;
      case '/accounting/pnl':
        return <FinancialReportsView />;
      case '/reports':
        return <PrintReportsView />;
      case '/accounting/expenses':
        return <ExpensesView />;
      case '/accounting/payments':
        return <PaymentsView />;
      case '/accounting/daily-till':
      case '/accounting/cash-register':
        return <DailyCashTillView />;
      case '/accounting/salary':
      case '/payroll':
        return <PayrollView />;
      case '/accounting/reconciliation':
        return <ReconciliationView />;
      case '/accounting/payable-receivable':
        return <PayableReceivableView />;
      case '/crm':
      case '/crm/dashboard':
        return <CRMManagementView initialTab="dashboard" />;
      case '/crm/leads':
        return <CRMManagementView initialTab="leads" />;
      case '/crm/tasks':
        return <CRMManagementView initialTab="tasks" />;
      case '/crm/customers':
        return <CRMManagementView initialTab="customer360" />;
      case '/crm/segments':
        return <CRMManagementView initialTab="segments" />;
      case '/crm/interactions':
        return <CRMManagementView initialTab="interactions" />;
      case '/crm/opportunities':
        return <CRMManagementView initialTab="opportunities" />;
      case '/crm/campaigns':
        return <CRMManagementView initialTab="campaigns" />;
      case '/crm/tickets':
        return <CRMManagementView initialTab="tickets" />;
      case '/crm/feedback':
        return <CRMManagementView initialTab="feedback" />;
      case '/crm/reports':
        return <CRMManagementView initialTab="reports" />;
      case '/crm/automations':
        return <CRMManagementView initialTab="automations" />;
      case '/pricing':
      case '/pricing/engine':
      case '/pricing/market':
        return <DynamicPricingView />;
      case '/hr':
      case '/hr/employees':
      case '/hr/attendance':
      case '/hr/leaves':
      case '/hr/payroll':
      case '/hr/recruitment':
      case '/hr/performance':
      case '/hr/offboarding':
        return <HRManagementView currentUser={currentUser} />;
      case '/settings/users':
        return <UsersView />;
      case '/settings/security':
      case '/settings/backups':
        return <SystemSecurityView />;
      case '/audit-log':
      case '/audit-logs':
        return <AuditLogView />;
      case '/settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };


  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[var(--text)] tracking-wide uppercase">
            Loading Mirage Perfume ERP...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans antialiased transition-colors">
      {/* Unified TopBar - ONE continuous header across the entire top of the application */}
      <TopBar onOpenShortcuts={() => setShowShortcutsModal(true)} />

      {/* Application Body: Sidebar + Main Canvas underneath the top header */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Mobile backdrop overlay - only on small screens (< md) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity md:hidden"
            onClick={() => setSidebarOpen(false)}
            title="Click to collapse sidebar"
          />
        )}

        {/* Collapsible Sidebar: full width (w-64) or icon rail (w-16) on desktop */}
        <div
          className={`h-full shrink-0 z-30 transition-all duration-200 ease-in-out bg-[var(--sidebar-bg)] border-r border-[var(--border)] ${
            sidebarOpen
              ? 'w-64 translate-x-0'
              : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
          } fixed md:static top-14 bottom-0 left-0`}
        >
          <Sidebar />
        </div>

        {/* Scrollable View Canvas - Expands to fill available space */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin min-w-0 bg-[var(--bg)]">
          <ErrorBoundary key={activePath} onReset={() => setActivePath('/dashboard')}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <MainLayout />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

