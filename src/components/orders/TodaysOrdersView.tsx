import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  Printer,
  Phone,
  Truck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  RefreshCw,
  Star,
  Tag,
  Building2,
  X,
  ChevronDown,
  MoreVertical,
  Store,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { InvoiceModal } from './InvoiceModal';
import { EditOrderModal } from './EditOrderModal';
import { MerchantStickerModal } from '../packing/MerchantStickerModal';
import { OrderWorkspaceModal } from './OrderWorkspaceModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { CancelOrderModal } from './CancelOrderModal';
import { Modal } from '../common/Modal';
import { generateShippingLabelPdf } from '../../lib/labelPdf';
import { generateInvoicePdf } from '../../lib/invoicePdf';
import { generateOrderSheetPdf } from '../../lib/orderSheetPdf';
import {
  PAGE_SIZE_OPTIONS,
  fulfillmentLabel,
  orderPaymentState,
  orderCodStatus,
  getRelativeTime,
  getCustomerStats,
} from './orderHelpers';

export const TodaysOrdersView: React.FC = () => {
  const {
    orders,
    products,
    customers,
    courierBookings,
    bookCourier,
    cancelOrder,
    refreshAll,
    settings,
    customerReturns,
  } = useApp();
  const { can } = useAuth();

  // Page state
  const [pageOrders, setPageOrders] = useState<Order[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number>>({});
  const [serverPageSize, setServerPageSize] = useState(25);
  const effectivePageSize = serverPageSize === 0 ? 100000 : serverPageSize;
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [pageRefreshKey, setPageRefreshKey] = useState(0);

  // Tabs for Today: all | needs_booking | confirmed | packed | dispatched
  const [activeTab, setActiveTab] = useState<'all' | 'needs_booking' | 'confirmed' | 'packed' | 'dispatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'messenger' | 'walk-in'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(['payment', 'items']));
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);

  // Table header menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Glance Popover & Customer profile
  const [glancePopover, setGlancePopover] = useState<{ order: Order; x: number; y: number } | null>(null);
  const [customerRatings, setCustomerRatings] = useState<Record<string, number>>({});
  const [customerProfileData, setCustomerProfileData] = useState<{
    customerName: string;
    phone: string;
    address: string;
    rating: number;
    notes: string;
    stats: any;
    orders: Order[];
  } | null>(null);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showMerchantStickerModal, setShowMerchantStickerModal] = useState(false);
  const [merchantStickerOrder, setMerchantStickerOrder] = useState<Order | null>(null);
  const [cancellationTarget, setCancellationTarget] = useState<Order | null>(null);
  const [stickerBlockMsg, setStickerBlockMsg] = useState<string | null>(null);

  // Close menus on outside click / escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setShowColumnsDropdown(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowColumnsDropdown(false);
        setShowHeaderMenu(false);
        setGlancePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Fetch orders for Today's Work Queue from backend API
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(currentPage),
      page_size: String(effectivePageSize),
      view: 'today',
    });

    if (activeTab === 'confirmed' || activeTab === 'packed' || activeTab === 'dispatched') {
      params.set('status', activeTab);
    }
    if (channelFilter !== 'all') params.set('channel', channelFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    setIsLoadingOrders(true);
    fetch(`/api/orders?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((result) => {
        if (controller.signal.aborted) return;
        setPageOrders(result.orders || []);
        setServerTotal(result.total || 0);
        setServerTotalPages(result.total_pages || 1);
        setServerStatusCounts(result.status_counts || {});
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Failed to fetch today orders:', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingOrders(false);
      });

    return () => controller.abort();
  }, [activeTab, channelFilter, effectivePageSize, currentPage, searchQuery, pageRefreshKey]);

  const isOrderBooked = (order: Order) =>
    Boolean(order.courier_tracking_code || courierBookings.find((b) => b.order_id === order.id)?.consignment_no);

  // Client-side filtering for 'needs_booking' tab if selected, and strictly excluding cancelled orders
  const displayedOrders = pageOrders.filter((order) => {
    if (order.status === 'cancelled') return false;
    if (activeTab === 'needs_booking') {
      return (
        order.fulfillment_method === 'steadfast' &&
        ['confirmed', 'packed'].includes(order.status) &&
        !isOrderBooked(order)
      );
    }
    return true;
  });

  // Tab counts
  const needsBookingCount = orders.filter(
    (o) =>
      o.status !== 'cancelled' &&
      o.fulfillment_method === 'steadfast' &&
      ['confirmed', 'packed'].includes(o.status) &&
      !isOrderBooked(o)
  ).length;

  const counts = {
    all: serverTotal,
    needs_booking: needsBookingCount,
    confirmed: serverStatusCounts.confirmed || 0,
    packed: serverStatusCounts.packed || 0,
    dispatched: serverStatusCounts.dispatched || 0,
  };

  // Bulk selections
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(displayedOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkTargetCounts = {
    book: orders.filter(
      (o) =>
        selectedOrderIds.includes(o.id) &&
        o.fulfillment_method === 'steadfast' &&
        ['confirmed', 'packed'].includes(o.status) &&
        !isOrderBooked(o)
    ).length,
    stickers: orders.filter(
      (o) => selectedOrderIds.includes(o.id) && o.fulfillment_method === 'steadfast' && isOrderBooked(o)
    ).length,
    invoices: orders.filter(
      (o) => selectedOrderIds.includes(o.id) && o.order_type !== 'merchant_fulfillment'
    ).length,
  };

  const handleBulkBook = async () => {
    const targets = orders.filter(
      (o) =>
        selectedOrderIds.includes(o.id) &&
        o.fulfillment_method === 'steadfast' &&
        ['confirmed', 'packed'].includes(o.status) &&
        !isOrderBooked(o)
    );
    if (targets.length === 0) return;
    setIsProcessingBulk(true);
    try {
      for (const target of targets) await bookCourier(target.id);
      await refreshAll();
      setSelectedOrderIds([]);
      setPageRefreshKey((v) => v + 1);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkPrintStickers = () => {
    const targets = orders.filter(
      (o) => selectedOrderIds.includes(o.id) && o.fulfillment_method === 'steadfast' && isOrderBooked(o)
    );
    if (targets.length === 0) return;
    targets.forEach((target) => {
      generateShippingLabelPdf(target, {
        business_name: settings?.company_name || 'Mirage Perfume Bangladesh',
        business_phone: settings?.phone || '',
      });
    });
  };

  const handleBulkPrintInvoices = () => {
    const targets = orders.filter(
      (o) => selectedOrderIds.includes(o.id) && o.order_type !== 'merchant_fulfillment'
    );
    if (targets.length === 0) return;
    targets.forEach((target) => {
      generateInvoicePdf(target, {
        business_name: settings?.company_name || 'Mirage Perfume Bangladesh',
        business_phone: settings?.phone || '',
        business_address: settings?.address || '',
      });
    });
  };

  const handleSendToSteadfast = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (!['confirmed', 'packed'].includes(order.status)) return;
    await bookCourier(order.id);
    await refreshAll();
    setPageRefreshKey((v) => v + 1);
  };

  const handleOpenCustomerProfile = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const stats = getCustomerStats(order.customer_phone, order.id, customers, orders, customerRatings);
    const normalizedPhone = order.customer_phone.replace(/[^0-9]/g, '');

    setCustomerProfileData({
      customerName: order.customer_name,
      phone: order.customer_phone,
      address: order.delivery_address_text || 'Showroom In-Store Handoff',
      rating: customerRatings[normalizedPhone] || stats.currentRating,
      notes:
        order.notes ||
        (stats.isRisk
          ? 'Requires advance COD verification before dispatch.'
          : 'VIP Customer. Priority fragrance packaging.'),
      stats,
      orders: stats.allOrders.length > 0 ? stats.allOrders : [order],
    });
  };

  const handleConfirmCancellation = async (orderId: string, reason: string) => {
    await cancelOrder(orderId, reason);
    setSelectedOrder(null);
    setPageOrders((prev) => prev.filter((o) => o.id !== orderId));
    setServerTotal((prev) => Math.max(0, prev - 1));
    await refreshAll();
    setPageRefreshKey((v) => v + 1);
  };

  const hasWesternPendingWork = (order: Order) =>
    !['packed', 'dispatched', 'delivered', 'cancelled', 'returned', 'rto'].includes(order.status) &&
    order.items.some(
      (item) =>
        item.perfume_type === 'Western' ||
        products.some((product) => product.id === item.product_id && product.perfume_type === 'Western')
    );

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto" id="todays-orders-view">
      {/* Purpose Banner */}
      <div className="bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-sm font-bold">Today&apos;s Work Queue</div>
          <div className="text-xs opacity-85">
            Operational processing for orders scheduled or confirmed today. Review, book couriers, pack, and complete dispatch.
          </div>
        </div>
        <div className="text-right text-xs font-num whitespace-nowrap bg-black/15 px-3 py-1.5 rounded-lg font-semibold">
          {counts.confirmed + counts.packed + counts.dispatched} Active Today
        </div>
      </div>

      {/* Tabs bar: Operational stages only */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            <span>All Today</span>
            <span className="px-1.5 py-0.2 rounded font-num text-[10px] bg-black/15">{counts.all}</span>
          </button>

          <button
            onClick={() => { setActiveTab('needs_booking'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'needs_booking'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Needs Booking</span>
            <span className="px-1.5 py-0.2 rounded font-num text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {counts.needs_booking}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('confirmed'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'confirmed'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            <span>Ready to Pack</span>
            <span className="px-1.5 py-0.2 rounded font-num text-[10px] pill-teal border">{counts.confirmed}</span>
          </button>

          <button
            onClick={() => { setActiveTab('packed'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'packed'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            <span>Packed / Ready to Ship</span>
            <span className="px-1.5 py-0.2 rounded font-num text-[10px] pill-amber border">{counts.packed}</span>
          </button>

          <button
            onClick={() => { setActiveTab('dispatched'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dispatched'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            <span>Out for Delivery</span>
            <span className="px-1.5 py-0.2 rounded font-num text-[10px] pill-teal border">{counts.dispatched}</span>
          </button>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-3 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold font-num">
                {selectedOrderIds.length}
              </span>
              <span className="text-xs font-semibold text-[var(--text)]">
                {selectedOrderIds.length === 1 ? '1 order selected' : `${selectedOrderIds.length} orders selected`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] underline cursor-pointer ml-1"
              >
                Deselect all
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {bulkTargetCounts.book > 0 && (
                <button
                  onClick={handleBulkBook}
                  disabled={isProcessingBulk}
                  className="erp-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                  title={`Book ${bulkTargetCounts.book} Steadfast orders`}
                >
                  {isProcessingBulk ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Book Steadfast ({bulkTargetCounts.book})</span>
                    </>
                  )}
                </button>
              )}

              {bulkTargetCounts.stickers > 0 && (
                <button
                  onClick={handleBulkPrintStickers}
                  className="erp-btn-secondary text-xs flex items-center gap-1.5"
                  title={`Print ${bulkTargetCounts.stickers} Steadfast thermal stickers`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Stickers ({bulkTargetCounts.stickers})</span>
                </button>
              )}

              {bulkTargetCounts.invoices > 0 && (
                <button
                  onClick={handleBulkPrintInvoices}
                  className="erp-btn-secondary text-xs flex items-center gap-1.5"
                  title={`Print ${bulkTargetCounts.invoices} customer invoices`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Invoices ({bulkTargetCounts.invoices})</span>
                </button>
              )}

              <button
                onClick={() => {
                  const targets = orders.filter((o) => selectedOrderIds.includes(o.id));
                  generateOrderSheetPdf(targets, courierBookings, "Today's Orders Packing Sheet");
                }}
                className="erp-btn-ghost text-xs flex items-center gap-1.5"
                title="Print a packing summary sheet for today"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Summary Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-lg cursor-pointer"
                title="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dense Controls Bar */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value as any); setCurrentPage(1); }}
              className="erp-select text-xs"
            >
              <option value="all">All Channels</option>
              <option value="messenger">Messenger</option>
              <option value="walk-in">Walk-in POS</option>
            </select>

            {/* Column toggle */}
            <div className="relative" ref={columnsDropdownRef}>
              <button
                type="button"
                onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border-[var(--border)] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                <span>Columns</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showColumnsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showColumnsDropdown && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3 w-48">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-2 tracking-wider">
                    Optional Columns
                  </div>
                  {[
                    { key: 'payment', label: 'Payment' },
                    { key: 'items', label: 'Items' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 py-1 cursor-pointer text-xs text-[var(--text)] hover:text-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(key)}
                        onChange={() => {
                          setVisibleColumns((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        }}
                        className="rounded border-[var(--border)] text-[var(--accent)] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Header menu */}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="flex items-center justify-center w-8 h-8 rounded-lg border bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border-[var(--border)] transition-colors cursor-pointer"
                title="Table options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showHeaderMenu && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-1.5 w-60">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] px-2.5 pt-1 pb-1.5 tracking-wider">
                    Today&apos;s Options
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      refreshAll();
                      setPageRefreshKey((v) => v + 1);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer text-left"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    Refresh Today&apos;s Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targets = displayedOrders.filter((o) => o.order_type !== 'merchant_fulfillment');
                      targets.forEach((o) =>
                        generateInvoicePdf(o, {
                          business_name: settings?.company_name || 'Mirage Perfume Bangladesh',
                          business_phone: settings?.phone || '',
                          business_address: settings?.address || '',
                        })
                      );
                      setShowHeaderMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer text-left"
                  >
                    <Printer className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    Print Invoices (Current Page)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search input */}
          <div className="relative ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search today's orders..."
              className="erp-input pl-7 w-48 sm:w-60 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main High-Density Table */}
      <div className="dense-table-container">
        <div className="overflow-auto max-h-[70vh]">
          <table className="dense-table min-w-[1750px]">
            <thead>
              <tr>
                <th className="w-28">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={displayedOrders.length > 0 && selectedOrderIds.length === displayedOrders.length}
                      disabled={displayedOrders.length === 0}
                      className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer w-3.5 h-3.5"
                      title="Select all on this page"
                    />
                    <span>Order</span>
                  </div>
                </th>
                <th className="w-56">Customer &amp; Address</th>
                <th className="w-20">Time</th>
                <th className="w-24 text-center">Fulfillment Stage</th>
                <th className="w-24 text-center">Cust. Type</th>
                <th className="w-32 text-center">Courier Booking</th>
                <th className="w-20 text-center">COD</th>
                <th className="w-16 text-center">Print</th>
                <th className="w-28">Consignment</th>
                <th className="w-24 text-right">Score</th>
                <th className="w-20 text-right">Total</th>
                <th className="w-20 text-center">Origin</th>
                <th className="w-28">Created By</th>
                <th className="w-24 text-right">Glance</th>
                {visibleColumns.has('payment') && <th className="w-28">Payment</th>}
                {visibleColumns.has('items') && <th className="w-20 text-center">Items</th>}
              </tr>
            </thead>
            <tbody>
              {displayedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={14 + (visibleColumns.has('payment') ? 1 : 0) + (visibleColumns.has('items') ? 1 : 0)}
                    className="p-10 text-center text-xs text-[var(--text-secondary)]"
                  >
                    No orders in Today&apos;s queue matching the filter criteria.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => {
                  const stats = getCustomerStats(order.customer_phone, order.id, customers, orders, customerRatings);
                  const isSelected = selectedOrderIds.includes(order.id);
                  const courierBooking = courierBookings.find((b) => b.order_id === order.id);
                  const booked = isOrderBooked(order);
                  const pState = orderPaymentState(order, customerReturns);
                  const codState = orderCodStatus(order, customerReturns);
                  const custTypeLabel = stats.isRisk ? 'Risk' : stats.isNew ? 'New' : 'Returning';
                  const consignment = order.courier_tracking_code || courierBooking?.consignment_no || courierBooking?.booking_id || '';
                  const itemQty = (order.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
                  const originLabel = order.channel === 'walk-in' ? 'Walk-in' : 'Messenger';

                  const glanceR = stats.pending > 0 ? 4 : stats.completed > 0 ? 3 : (stats.cancelled + stats.refunded) > 0 ? 2 : 1;
                  const glanceLabel =
                    glanceR === 4
                      ? `${stats.pending} Pending`
                      : glanceR === 3
                      ? `${stats.completed} Delivered`
                      : glanceR === 2
                      ? `${stats.cancelled + stats.refunded} Cancelled`
                      : 'New';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`dense-table-row-clickable ${isSelected ? 'dense-table-row-selected' : ''}`}
                    >
                      {/* Order column */}
                      <td className="align-middle">
                        <div className="relative inline-flex items-center">
                          <span
                            className={`dense-row-checkbox absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center ${
                              isSelected ? 'dense-row-checkbox-active opacity-100' : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(order.id)}
                              className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer w-3.5 h-3.5"
                              title="Select this order"
                            />
                          </span>
                          <span className="font-num font-bold text-[var(--accent)] hover:underline pl-6">
                            #{order.invoice_number.replace('INV-2026-', '')}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td className="align-middle">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[var(--text)] line-clamp-1 flex items-center gap-1.5 flex-wrap">
                            <span>{order.customer_name}</span>
                            {order.order_type === 'merchant_fulfillment' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[color-mix(in_srgb,var(--status-purple)_12%,transparent)] text-[var(--status-purple)] border border-[color-mix(in_srgb,var(--status-purple)_30%,transparent)]">
                                <Building2 className="w-2.5 h-2.5" />
                                <span>Dropship</span>
                              </span>
                            )}
                            {hasWesternPendingWork(order) && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold pill-amber">
                                Western - Packing Pending
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-num text-[11px] text-[var(--accent)] font-semibold">
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            <span>{order.customer_phone}</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                            {order.delivery_address_text || 'Showroom In-Store Handoff'}
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="align-middle text-[11px] text-[var(--text-secondary)] whitespace-nowrap font-num">
                        {getRelativeTime(order.created_at)}
                      </td>

                      {/* Status */}
                      <td className="align-middle text-center">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Customer Type */}
                      <td className="align-middle text-center">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            stats.isRisk
                              ? 'pill-red'
                              : stats.isNew
                              ? 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)]'
                              : 'pill-green'
                          }`}
                        >
                          {custTypeLabel}
                        </span>
                      </td>

                      {/* Fulfillment / Book Steadfast */}
                      <td className="align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        {order.fulfillment_method === 'steadfast' && ['confirmed', 'packed'].includes(order.status) && !booked ? (
                          <button
                            type="button"
                            onClick={(e) => handleSendToSteadfast(e, order)}
                            className="px-2 py-0.5 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] rounded text-[10px] font-semibold shadow-xs cursor-pointer"
                          >
                            Book Steadfast
                          </button>
                        ) : order.fulfillment_method === 'steadfast' && booked ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--accent)] font-semibold text-[10px] border border-[var(--border)] font-num whitespace-nowrap"
                            title={order.courier_tracking_code || courierBooking?.consignment_no || ''}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-[var(--accent)]" />
                            Booked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold text-[10px] border border-[var(--border)] whitespace-nowrap">
                            {order.fulfillment_method === 'steadfast' && <Truck className="w-2.5 h-2.5" />}
                            {fulfillmentLabel(order)}
                          </span>
                        )}
                      </td>

                      {/* COD / Payment status */}
                      <td className="align-middle text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-num border whitespace-nowrap ${
                            codState.tone === 'amber' ? 'pill-amber' : codState.tone === 'red' ? 'pill-red' : 'pill-green'
                          }`}
                        >
                          {codState.label}
                        </span>
                      </td>

                      {/* Print */}
                      <td className="align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (order.order_type === 'merchant_fulfillment') {
                              setMerchantStickerOrder(order);
                              setShowMerchantStickerModal(true);
                            } else {
                              setActiveInvoiceOrder(order);
                              setShowInvoiceModal(true);
                            }
                          }}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors cursor-pointer"
                          title={order.order_type === 'merchant_fulfillment' ? 'Print merchant sticker' : 'View & print invoice'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Consignment */}
                      <td className="align-middle whitespace-nowrap">
                        {consignment ? (
                          <span className="font-mono text-[10px] font-semibold text-[var(--accent)]" title={consignment}>
                            {consignment}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-[11px]">—</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="align-middle text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-num text-[var(--accent-secondary)] border border-[color-mix(in_srgb,var(--accent-secondary)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-secondary)_12%,transparent)]">
                          <Star className="w-2.5 h-2.5 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
                          {stats.currentRating}.0
                        </span>
                      </td>

                      {/* Total */}
                      <td className="align-middle text-right font-num font-bold text-[var(--text)]">
                        ৳{order.total.toLocaleString()}
                      </td>

                      {/* Origin */}
                      <td className="align-middle text-center">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {order.channel === 'walk-in' ? <Store className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                          {originLabel}
                        </span>
                      </td>

                      {/* Created By */}
                      <td className="align-middle whitespace-nowrap text-[11px] text-[var(--text-secondary)]">
                        {order.created_by_name || '—'}
                      </td>

                      {/* Glance */}
                      <td className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-num border cursor-pointer whitespace-nowrap ${
                            glanceR === 4
                              ? 'pill-amber'
                              : glanceR === 3
                              ? 'pill-green'
                              : glanceR === 2
                              ? 'pill-red'
                              : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                          }`}
                          onClick={(e) => handleOpenCustomerProfile(e, order)}
                          title={`Customer History: ${stats.completed} Delivered, ${stats.pending} In-Progress, ${stats.refunded} RTO, ${stats.cancelled} Cancelled`}
                        >
                          {glanceLabel}
                        </span>
                      </td>

                      {/* Optional Payment */}
                      {visibleColumns.has('payment') && (
                        <td className="align-middle whitespace-nowrap">
                          <div className="text-[10px] font-bold text-[var(--text)]">{pState.label}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-num">
                            {pState.received > 0 ? `৳${pState.received.toLocaleString()} received` : '—'}
                          </div>
                        </td>
                      )}

                      {/* Optional Items */}
                      {visibleColumns.has('items') && (
                        <td className="align-middle text-center font-num text-[11px] text-[var(--text)]">
                          {itemQty}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {displayedOrders.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-[var(--text-secondary)] font-num whitespace-nowrap">
            Showing {(currentPage - 1) * effectivePageSize + 1}–
            {Math.min(currentPage * effectivePageSize, serverTotal)} of {serverTotal}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-num text-[var(--text)] px-2 font-semibold">
              Page {currentPage} of {serverTotalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(serverTotalPages, currentPage + 1))}
              disabled={currentPage >= serverTotalPages}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <select
              value={serverPageSize}
              onChange={(e) => { setServerPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="erp-select text-xs ml-2"
              aria-label="Orders per page"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 0 ? 'All' : `${opt} / page`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Shared Order Workspace Modal */}
      {selectedOrder && (
        <OrderWorkspaceModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onCancelOrder={(order) => setCancellationTarget(order)}
          onEditOrder={(order) => {
            setEditingOrder(order);
            setShowEditModal(true);
          }}
          onViewInvoice={(order) => {
            setActiveInvoiceOrder(order);
            setShowInvoiceModal(true);
          }}
          onPrintMerchantSticker={(order) => {
            setMerchantStickerOrder(order);
            setShowMerchantStickerModal(true);
          }}
        />
      )}

      {/* Customer Profile Modal */}
      {customerProfileData && (
        <CustomerProfileModal
          data={customerProfileData}
          onClose={() => setCustomerProfileData(null)}
          onUpdateRating={(rating) => {
            const phone = customerProfileData.phone.replace(/[^0-9]/g, '');
            setCustomerRatings((prev) => ({ ...prev, [phone]: rating }));
            setCustomerProfileData((prev) => (prev ? { ...prev, rating } : null));
          }}
        />
      )}

      {/* Cancel Order Modal */}
      {cancellationTarget && (
        <CancelOrderModal
          order={cancellationTarget}
          isOpen={true}
          onClose={() => setCancellationTarget(null)}
          onConfirm={handleConfirmCancellation}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onOrderUpdated={(updated) => setSelectedOrder(updated)}
        />
      )}

      {/* Invoice Modal */}
      {activeInvoiceOrder && (
        <InvoiceModal
          order={activeInvoiceOrder}
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Merchant Dropship Sticker Modal */}
      {merchantStickerOrder && (
        <MerchantStickerModal
          order={merchantStickerOrder}
          isOpen={showMerchantStickerModal}
          onClose={() => {
            setShowMerchantStickerModal(false);
            setMerchantStickerOrder(null);
          }}
        />
      )}
    </div>
  );
};
