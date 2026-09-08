import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Truck,
  Send,
  Users,
  Landmark,
  Tag,
  FileBarChart,
  ShieldCheck,
  History,
  Settings,
  ClipboardList,
  UserCheck,
  HeartHandshake,
  ChevronDown,
  ChevronRight,
  Menu,
  Sparkles,
  UserCircle,
  X,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { NAV_CONFIG, NavItem } from '../../lib/nav-config';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  ShoppingCart: <ShoppingCart className="w-5 h-5" />,
  PackageCheck: <PackageCheck className="w-5 h-5" />,
  Boxes: <Boxes className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Send: <Send className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  HeartHandshake: <HeartHandshake className="w-5 h-5" />,
  Landmark: <Landmark className="w-5 h-5" />,
  Tag: <Tag className="w-5 h-5" />,
  FileBarChart: <FileBarChart className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  History: <History className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
};

export const Sidebar: React.FC = () => {
  const { currentUser, tier, switchUser, users, logout } = useAuth();
  const { activePath, setActivePath, orders, products, sidebarOpen, setSidebarOpen, toggleSidebar } = useApp();
  const collapsed = !sidebarOpen;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    orders: true,
    inventory: true,
    accounting: false,
  });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  // Computed badge counts
  const pendingOrdersCount = orders.filter(o => o.status === 'confirmed').length;
  const preOrdersCount = orders.filter(o => o.order_timing === 'pre_order' && o.status !== 'cancelled').length;
  const scheduledOrdersCount = orders.filter(o => o.order_timing === 'scheduled' && o.status !== 'cancelled').length;
  const lowStockCount = products.filter(p => (p.stock_available || 0) <= (p.low_stock_threshold || 3)).length;

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.path && activePath === item.path) return true;
    if (item.children) {
      return item.children.some(c => c.path === activePath);
    }
    return false;
  };

  const getBadgeValue = (item: NavItem): number | null => {
    if (item.id === 'orders' || item.badgeKey === 'pending_packing') {
      return pendingOrdersCount > 0 ? pendingOrdersCount : null;
    }
    if (item.id === 'inventory') {
      return lowStockCount > 0 ? lowStockCount : null;
    }
    return null;
  };

  return (
    <aside
      className={`relative flex flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-all duration-200 z-20 select-none ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0 h-full`}
      id="main-sidebar"
    >
      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        {NAV_CONFIG.map(item => {
          // Filter by required tier
          const tierNames: Record<number, string> = {
            1: 'owner',
            2: 'general_manager',
            3: 'manager',
            4: 'packing_staff',
          };
          const currentTierName = tierNames[tier] || 'owner';
          if (item.requiresTier && !item.requiresTier.includes(currentTierName)) {
            return null;
          }

          const active = isItemActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedGroups[item.id];
          const badge = getBadgeValue(item);

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => collapsed && setHoveredItem(item.id)}
              onMouseLeave={() => collapsed && setHoveredItem(null)}
            >
              {hasChildren ? (
                <button
                  onClick={() => {
                    if (collapsed) {
                      setSidebarOpen(true);
                      setExpandedGroups(prev => ({ ...prev, [item.id]: true }));
                    } else {
                      toggleGroup(item.id);
                    }
                  }}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                  } rounded-lg text-sm font-medium transition-colors cursor-pointer relative ${
                    active
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-semibold shadow-[inset_3px_0_0_var(--sidebar-active-text)]'
                      : 'text-[var(--sidebar-text)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text)]'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <span className={active ? 'text-[var(--accent)]' : 'text-[var(--sidebar-text)]/70'}>
                      {ICON_MAP[item.icon] || <Boxes className="w-5 h-5" />}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {collapsed && badge !== null && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}

                  {!collapsed && (
                    <div className="flex items-center gap-1.5">
                      {badge !== null && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                          {badge}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--sidebar-text)]/70" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--sidebar-text)]/70" />
                      )}
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (item.path) {
                      setActivePath(item.path);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }
                  }}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                  } rounded-lg text-sm font-medium transition-colors cursor-pointer relative ${
                    active
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] shadow-[inset_3px_0_0_var(--sidebar-active-text)] font-semibold'
                      : 'text-[var(--sidebar-text)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <span className={active ? 'text-[var(--accent-contrast)]' : 'text-[var(--sidebar-text)]/70'}>
                      {ICON_MAP[item.icon] || <Boxes className="w-5 h-5" />}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {collapsed && badge !== null && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}

                  {!collapsed && badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        active ? 'bg-black/20 text-[var(--accent-contrast)]' : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              )}

              {/* Sub-items in expanded state */}
              {!collapsed && hasChildren && isExpanded && (
                <div className="mt-1 ml-4 pl-4 border-l border-[var(--border)] space-y-0.5 py-1">
                  {item.children?.map(child => {
                    const childActive = activePath === child.path;
                    return (
                      <button
                        key={child.path}
                        onClick={() => {
                          setActivePath(child.path);
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setSidebarOpen(false);
                          }
                        }}
                        aria-current={childActive ? 'page' : undefined}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                          childActive
                            ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-semibold shadow-[inset_3px_0_0_var(--sidebar-active-text)]'
                            : 'text-[var(--sidebar-text)]/80 hover:text-[var(--sidebar-text)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <span>{child.label}</span>
                        {child.label === 'Walk-in Sale' && (
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                            POS
                          </span>
                        )}
                        {child.path === '/orders/scheduled' && scheduledOrdersCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {scheduledOrdersCount}
                          </span>
                        )}
                        {child.path === '/orders/pre-orders' && preOrdersCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            {preOrdersCount}
                          </span>
                        )}
                        {child.label === 'New Order' && pendingOrdersCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Collapsed Hover Tooltip for single item */}
              {collapsed && hoveredItem === item.id && !hasChildren && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-[var(--surface)] text-[var(--text)] text-xs font-semibold rounded-md shadow-lg border border-[var(--border)] whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                  {badge !== null && ` (${badge})`}
                </div>
              )}

              {/* Collapsed Hover Flyout Panel for grouped items */}
              {collapsed && hoveredItem === item.id && hasChildren && (
                <div className="absolute left-full top-0 ml-2.5 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-[var(--text)]">
                  <div className="px-3 py-1 text-xs font-bold text-[var(--text)] border-b border-[var(--border)] mb-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {badge !== null && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                        {badge}
                      </span>
                    )}
                  </div>
                  {item.children?.map(child => (
                    <button
                      key={child.path}
                      onClick={() => {
                        setActivePath(child.path);
                        setHoveredItem(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        activePath === child.path
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold'
                          : 'text-[var(--text)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span>{child.label}</span>
                      {child.label === 'Walk-in Sale' && (
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                          POS
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pinned User Menu & Role Switcher at bottom */}
      <div className={`p-2 border-t border-[var(--border)] bg-[var(--sidebar-bg)] ${collapsed ? 'flex justify-center' : ''}`}>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center ${
              collapsed ? 'justify-center p-1.5' : 'gap-2.5 p-1.5 w-full'
            } rounded-lg hover:bg-[var(--surface-hover)] border border-transparent transition-all cursor-pointer text-left`}
            title={collapsed ? `${currentUser?.name} (Tier ${tier}: ${currentUser?.role})` : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[var(--sidebar-text)] truncate">{currentUser?.name}</div>
                <div className="text-[10px] font-medium text-[var(--sidebar-muted)] uppercase tracking-wider">
                  Tier {tier}: {currentUser?.role}
                </div>
              </div>
            )}
          </button>

          {/* User Switcher Dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50 animate-in fade-in duration-100 text-[var(--text)]">
              <div className="px-2 py-1.5 text-[11px] font-bold text-[var(--text-muted)] border-b border-[var(--border)] flex items-center justify-between">
                <span>SWITCH TEST ROLE (4 Tiers)</span>
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div className="py-1 space-y-0.5">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer ${
                      u.id === currentUser?.id ? 'bg-[var(--accent)]/15 text-[var(--text)] font-bold' : 'hover:bg-[var(--surface-hover)] text-[var(--text)]'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Tier {u.tier}: {u.role}</div>
                    </div>
                    {u.id === currentUser?.id && <span className="text-xs text-[var(--accent)] font-bold">&#10003;</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--border)] pt-1 mt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setActivePath('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs text-[var(--text)] hover:bg-[var(--surface-hover)] font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCircle className="w-3.5 h-3.5" />
                  <span>My Profile & Settings</span>
                </button>
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs text-rose-500 hover:bg-rose-500/10 font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
