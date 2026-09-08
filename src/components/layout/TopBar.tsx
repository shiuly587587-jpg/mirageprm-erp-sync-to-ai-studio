import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  RefreshCw,
  LayoutGrid,
  ChevronDown,
  ChevronsUpDown,
  Sparkles,
  AlertTriangle,
  ShoppingCart,
  Sliders,
  LogOut,
  Keyboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const TopBar: React.FC<{ onOpenShortcuts?: () => void }> = ({ onOpenShortcuts }) => {
  const { currentUser, logout } = useAuth();
  const {
    activePath,
    setActivePath,
    notifications,
    markNotificationsRead,
    refreshAll,
    toggleSidebar,
    sidebarOpen,
  } = useApp();
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const priceNotifOn = currentUser?.toggles?.['notif_price_changed'] !== false;
  const visibleNotifications = notifications.filter(n => n.type !== 'price_changed' || priceNotifOn);
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifMenu(false);
      }
    };

    if (showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifMenu]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/orders/new':
        return 'New Order';
      case '/orders/walk-in':
        return 'Walk-in Sale';
      case '/orders/today':
        return "Today's Orders";
      case '/orders':
        return 'All Orders';
      case '/orders/cancelled':
        return 'Cancelled Orders';
      case '/orders/returns':
        return 'Returns & RTO';
      case '/packing':
        return 'Packing Station';
      case '/courier/bookings':
        return 'Courier Bookings';
      case '/inventory/products':
        return 'Products';
      case '/inventory/movements':
      case '/inventory/ledger':
        return 'Stock Movements';
      case '/customers':
        return 'Customers';
      case '/accounting/ledger':
        return 'Journal Entries';
      case '/accounting/pnl':
        return 'Financial Reports';
      case '/reports':
        return 'Reports';
      case '/accounting/expenses':
        return 'Expenses';
      case '/accounting/payments':
      case '/accounting/cash-register':
        return 'Daily Till';
      case '/accounting/salary':
      case '/payroll':
        return 'Payroll';
      case '/pricing':
        return 'Pricing Engine';
      case '/settings/users':
        return 'Users & Roles';
      case '/settings/security':
        return 'System Security';
      case '/audit-log':
        return 'Audit Log';
      case '/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const currentSection = activePath.replace('/', '') || 'dashboard';

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors shrink-0 select-none">
      {/* Left: Breadcrumb & Title with Grid Icon matching reference */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="text-[11px] text-gray-500 font-normal leading-tight truncate">
          Mirage Perfume / {currentSection}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-1.5 text-gray-900 hover:text-gray-700 transition-colors cursor-pointer group"
            title={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
          >
            <LayoutGrid className="w-4 h-4 text-gray-900 group-hover:scale-105 transition-transform" />
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-tight truncate">
              {getPageTitle(activePath)}
            </h1>
          </button>
        </div>
      </div>

      {/* Right Controls matching reference: Date Selector, View Toggle, Refresh */}
      <div className="flex items-center gap-2">
        {/* Date Selector Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 font-medium shadow-2xs cursor-pointer hover:bg-gray-50 transition-colors">
          <span>01 Sep 2026</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </div>

        {/* View / Sidebar Toggle Pill */}
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          title="Toggle navigation sidebar"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="w-8 h-8 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          title="Refresh live data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-gray-900' : ''}`} />
        </button>

        {/* Notification Bell (Discreet) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              if (unreadCount > 0) markNotificationsRead();
            }}
            className="w-8 h-8 rounded-md border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center relative"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900">Notifications</span>
                <span className="text-[11px] text-gray-400">{visibleNotifications.length} alerts</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {visibleNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">No notifications</div>
                ) : (
                  visibleNotifications.slice(0, 8).map(n => (
                    <div key={n.id} className="p-2.5 hover:bg-gray-50 text-xs">
                      <div className="flex items-start gap-2">
                        {n.type === 'new_order' ? (
                          <ShoppingCart className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                        ) : n.type === 'price_changed' ? (
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium leading-snug">{n.message}</p>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="w-8 h-8 rounded-md border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Settings Icon */}
        <button
          onClick={() => setActivePath('/settings')}
          className="w-8 h-8 rounded-md border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center"
          title="Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Quick Sign Out Icon */}
        <button
          onClick={logout}
          className="w-8 h-8 rounded-md border border-transparent hover:border-rose-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

