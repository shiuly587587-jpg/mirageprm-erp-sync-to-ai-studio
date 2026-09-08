import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  User,
  Phone,
  MapPin,
  Search,
  Building2,
  Tag,
  Package,
  Store,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Edit3,
  CreditCard,
  Banknote,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, FulfillmentMethod, OrderType, OrderTiming } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { InvoiceModal } from './InvoiceModal';
import { MerchantStickerModal } from '../packing/MerchantStickerModal';

export const NewOrderMessenger: React.FC<{ onOrderCreated?: (order: any) => void }> = ({
  onOrderCreated,
}) => {
  const { products, parseMessenger, createOrder, setActivePath, customers, settings } = useApp();
  const { currentUser } = useAuth();

  const [rawText, setRawText] = useState<string>('');
  const [parserOpen, setParserOpen] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [hasParsed, setHasParsed] = useState<boolean>(false);
  const [rawTextCollapsed, setRawTextCollapsed] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    parcelId?: string;
    items?: string;
  }>({});

  const [orderType, setOrderType] = useState<OrderType>('direct_sale');
  const [merchantName, setMerchantName] = useState<string>('');
  const [merchantId, setMerchantId] = useState<string>('');
  const [parcelId, setParcelId] = useState<string>('');
  const [endCustomerName, setEndCustomerName] = useState<string>('');

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('steadfast');
  const [instantDeliveryProvider, setInstantDeliveryProvider] = useState<'pathao' | 'uber' | 'other'>('pathao');
  const [deliveredByStaff, setDeliveredByStaff] = useState<string>('');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(settings?.inside_dhaka_delivery ?? 70);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [statedTotal, setStatedTotal] = useState<number>(0);
  const [totalMismatchWarning, setTotalMismatchWarning] = useState<string | null>(null);
  const [parserUsed, setParserUsed] = useState<string | null>(null);
  const [parsedStatedTotal, setParsedStatedTotal] = useState<number>(0);

  const [paymentState, setPaymentState] = useState<'cod' | 'prepaid'>('cod');
  const [invoiceNoteType, setInvoiceNoteType] = useState<'cod' | 'prepaid' | 'none'>('cod');
  const [invoiceNoteText, setInvoiceNoteText] = useState<string>('');

  const [orderTiming, setOrderTiming] = useState<OrderTiming>('today');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [timingReason, setTimingReason] = useState<string | null>(null);

  const [items, setItems] = useState<
    {
      product_id: string;
      product_name: string;
      unit_price: number;
      discount_amount: number;
      quantity: number;
      confidence?: string;
      candidates?: { id: string; name: string; price: number }[];
      raw_line?: string;
      stated_amount?: number;
    }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogTargetIndex, setCatalogTargetIndex] = useState<number | null>(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showStickerModal, setShowStickerModal] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const handleCopyOrderSummary = () => {
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const itemsText = items.map((it, idx) => {
      const itemFinal = Math.max(0, (it.unit_price || 0) * (it.quantity || 1) - (it.discount_amount || 0));
      const hasDiscount = (it.discount_amount || 0) > 0;
      return `${idx + 1}. ${it.product_name} × ${it.quantity} — ${itemFinal.toLocaleString()} Taka${hasDiscount ? ` (Unit: ${it.unit_price.toLocaleString()} Taka, Disc: ${it.discount_amount} Taka)` : ''}`;
    }).join('\n');

    const totalDiscount = (discountAmount || 0) + calculatedItemDiscount;
    const custName = customerName || (orderType === 'merchant_fulfillment' ? (endCustomerName || merchantName || 'Merchant Customer') : 'Valued Customer');
    const custPhone = customerPhone || 'N/A';
    const custAddress = deliveryAddress || 'N/A';

    let lines = [
      'Mirage Perfumes — Order Confirmation',
      '',
      currentDate,
      '',
      `Customer Name: ${custName}`,
      `Phone: ${custPhone}`,
      `Address: ${custAddress}`,
      '',
      'Products:',
      '',
      itemsText || '1. No products selected',
      '',
      `Subtotal: ${calculatedSubtotal.toLocaleString()} Taka`,
    ];

    if (deliveryCharge > 0) {
      lines.push(`Delivery Charge: ${deliveryCharge.toLocaleString()} Taka`);
    }

    if (totalDiscount > 0) {
      lines.push(`Total Discount: -${totalDiscount.toLocaleString()} Taka`);
    }

    lines.push(`Total: ${calculatedTotal.toLocaleString()} Taka`);

    if (paymentState === 'prepaid') {
      lines.push('Payment Status: Paid in Full');
    }

    lines.push('');
    lines.push('Please confirm your order details above. Thank you for shopping with Mirage Perfumes.');

    const summary = lines.join('\n');

    navigator.clipboard.writeText(summary).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }).catch(() => {});
  };

  const defaultCodTemplate =
    settings?.invoice_note_cod ||
    'Cash on Delivery: Please verify your parcel upon arrival and pay the due amount in cash to the delivery agent. Authentic Mirage Fragrance guaranteed.';
  const defaultPrepaidTemplate =
    settings?.invoice_note_prepaid ||
    'Prepaid Order: Payment already verified in full. No payment required at delivery. Thank you for shopping with Mirage Perfume.';

  useEffect(() => {
    if (invoiceNoteType === 'none') {
      setInvoiceNoteText('');
    } else if (invoiceNoteType === 'cod') {
      setInvoiceNoteText(defaultCodTemplate);
    } else if (invoiceNoteType === 'prepaid') {
      setInvoiceNoteText(defaultPrepaidTemplate);
    }
  }, [invoiceNoteType, defaultCodTemplate, defaultPrepaidTemplate]);

  useEffect(() => {
    if (!successOrder) return;
    const dismissTimer = window.setTimeout(() => {
      setSuccessOrder(null);
    }, 4000);
    return () => window.clearTimeout(dismissTimer);
  }, [successOrder]);

  const handlePaymentStateChange = (state: 'cod' | 'prepaid') => {
    setPaymentState(state);
    if (state === 'cod') {
      setInvoiceNoteType('cod');
      setInvoiceNoteText(defaultCodTemplate);
    } else {
      setInvoiceNoteType('prepaid');
      setInvoiceNoteText(defaultPrepaidTemplate);
    }
  };

  const existingCustomer =
    hasParsed && customerPhone.trim().length >= 10
      ? customers.find(
          c =>
            c.phone === customerPhone.replace(/[^0-9]/g, '') ||
            c.phone.endsWith(customerPhone.replace(/[^0-9]/g, '').slice(-11))
        )
      : null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setSuccessOrder(null);
    setFieldErrors({});

    try {
      const res = await parseMessenger(rawText);

      const parsedType = res.order_type || 'direct_sale';
      setOrderType(parsedType);
      if (res.merchant_name) setMerchantName(res.merchant_name);
      if (res.merchant_id) setMerchantId(res.merchant_id);
      if (res.parcel_id) setParcelId(res.parcel_id);
      if (res.end_customer_name) setEndCustomerName(res.end_customer_name);

      setCustomerName(res.customer_name || res.end_customer_name || '');
      setCustomerPhone(res.phone || '');
      setDeliveryAddress(res.address || '');
      setDeliveryCharge(res.delivery_charge !== undefined ? res.delivery_charge : 70);
      setStatedTotal(res.stated_total || 0);
      setParsedStatedTotal(res.stated_total || 0);
      setParserUsed(res.parser_used);
      setFulfillmentMethod(res.fulfillment_method || 'steadfast');
      setInstantDeliveryProvider(res.instant_delivery_provider || 'pathao');

      if (res.order_timing === 'pre_order' || res.order_timing === 'scheduled') {
        setOrderTiming(res.order_timing);
        setScheduledDate(res.scheduled_date || '');
        setTimingReason(res.timing_reason || null);
      } else {
        setOrderTiming('today');
        setScheduledDate('');
        setTimingReason(null);
      }

      const lower = rawText.toLowerCase();
      if (
        lower.includes('paid') ||
        lower.includes('prepaid') ||
        lower.includes('bkash paid') ||
        lower.includes('nagad paid') ||
        lower.includes('advance paid')
      ) {
        handlePaymentStateChange('prepaid');
      } else {
        handlePaymentStateChange('cod');
      }

      const mappedItems = (res.items || []).map((it: any) => {
        const isConfidentMatch = it.confidence === 'high' || it.confidence === 'medium';
        return {
          product_id: isConfidentMatch ? (it.matched_product_id || '') : '',
          product_name: isConfidentMatch ? (it.product_name || 'Matched Item') : (it.raw_product_name || it.product_name || 'Unmatched Item'),
          unit_price: isConfidentMatch ? (it.unit_price || 0) : 0,
          discount_amount: 0,
          quantity: it.quantity || 1,
          confidence: it.confidence,
          candidates: it.candidates || [],
          raw_line: it.raw_line,
          stated_amount: it.stated_amount,
        };
      });

      setItems(mappedItems);
      const validParsedItems = mappedItems.filter(it => it.product_id && it.confidence !== 'unmatched');
      const parsedCalculatedTotal = validParsedItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0) +
        (res.fulfillment_method === 'instant_delivery' ? 0 : Number(res.delivery_charge || 0));
      setTotalMismatchWarning(
        validParsedItems.length > 0 && res.stated_total > 0 && parsedCalculatedTotal !== res.stated_total
          ? `Total amount does not match the calculated amount — expected ৳${parsedCalculatedTotal}, message states ৳${res.stated_total}.`
          : null
      );
      setHasParsed(true);
      setRawTextCollapsed(true);
      setParserOpen(false);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse text. Please review manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddItem = (prod: Product) => {
    if (catalogTargetIndex !== null) {
      handleSelectItemProduct(catalogTargetIndex, prod.id);
      setCatalogTargetIndex(null);
      return;
    }
    const existingIndex = items.findIndex(i => i.product_id === prod.id);
    if (existingIndex >= 0) {
      setItems(prev =>
        prev.map((it, idx) => (idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it))
      );
    } else {
      setItems(prev => [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.display_name,
          unit_price: prod.selling_price,
          discount_amount: 0,
          quantity: 1,
          confidence: 'high',
        },
      ]);
    }
    if (fieldErrors.items) {
      setFieldErrors(prev => ({ ...prev, items: undefined }));
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setItems(prev =>
      prev
        .map((it, idx) => {
          if (idx === index) {
            const next = it.quantity + delta;
            return next > 0 ? { ...it, quantity: next } : null;
          }
          return it;
        })
        .filter(Boolean) as any
    );
  };

  const handleSelectItemProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    setItems(prev =>
      prev.map((it, idx) =>
        idx === index
          ? {
              ...it,
              product_id: prod.id,
              product_name: prod.display_name,
              unit_price: prod.selling_price,
              discount_amount: it.discount_amount || 0,
              confidence: 'high',
            }
          : it
      )
    );
  };

  const filteredCatalog = products.filter(p => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      (p.display_name && p.display_name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  });

  const calculatedSubtotal = items.reduce(
    (sum, it) => sum + (it.unit_price || 0) * (it.quantity || 1),
    0
  );
  const calculatedItemDiscount = items.reduce((sum, it) => sum + (it.discount_amount || 0), 0);

  const calculatedTotal = Math.max(
    0,
    calculatedSubtotal - calculatedItemDiscount +
      (fulfillmentMethod === 'instant_delivery' ? 0 : Number(deliveryCharge || 0)) - Number(discountAmount || 0)
  );

  const reviewMismatchWarning =
    hasParsed &&
    items.some(it => it.product_id && it.confidence !== 'unmatched') &&
    parsedStatedTotal > 0 &&
    calculatedTotal !== parsedStatedTotal
      ? `Total amount does not match the calculated amount — expected ৳${calculatedTotal}, message states ৳${parsedStatedTotal}.`
      : null;

  const handleResetForm = () => {
    setRawText('');
    setHasParsed(false);
    setRawTextCollapsed(false);
    setOrderType('direct_sale');
    setMerchantName('');
    setMerchantId('');
    setParcelId('');
    setEndCustomerName('');
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setFulfillmentMethod('steadfast');
    setInstantDeliveryProvider('pathao');
    setDeliveredByStaff('');
    setDeliveryCharge(settings?.inside_dhaka_delivery !== undefined ? settings.inside_dhaka_delivery : 70);
    setDiscountAmount(0);
    setStatedTotal(0);
    setParsedStatedTotal(0);
    setTotalMismatchWarning(null);
    setParserUsed(null);
    setPaymentState('cod');
    setInvoiceNoteType('cod');
    setInvoiceNoteText(defaultCodTemplate);
    setOrderTiming('today');
    setScheduledDate('');
    setTimingReason(null);
    setItems([]);
    setCatalogTargetIndex(null);
    setFieldErrors({});
    setSuccessOrder(null);
    setParseError(null);
  };

  const handleCreateOrder = async () => {
    const errors: {
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      parcelId?: string;
      items?: string;
    } = {};

    if (orderType === 'direct_sale') {
      if (!customerName.trim()) errors.customerName = 'Customer Name is required.';
      if (!customerPhone.trim()) errors.customerPhone = 'Mobile number is required.';
      if (!deliveryAddress.trim()) errors.deliveryAddress = 'Delivery address is required.';
    } else {
      if (!parcelId.trim()) errors.parcelId = 'Merchant Parcel ID is mandatory for dropship orders.';
    }

    if (items.length === 0) {
      errors.items = 'Please add at least one product to the order.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const orderPayload: any = {
        channel: 'messenger',
        order_type: orderType,
        source_text: rawText.trim() || undefined,
        discount_amount: discountAmount,
        fulfillment_method: fulfillmentMethod,
        instant_delivery_provider: fulfillmentMethod === 'instant_delivery' ? instantDeliveryProvider : undefined,
        rider_delivery_charge: fulfillmentMethod === 'instant_delivery' ? deliveryCharge : undefined,
        delivery_charge: fulfillmentMethod === 'instant_delivery' ? 0 : deliveryCharge,
        order_timing: orderTiming,
        scheduled_date: orderTiming === 'scheduled' ? (scheduledDate || undefined) : undefined,
        items: items.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount || 0,
        })),
      };

      if (orderType === 'direct_sale') {
        orderPayload.customer_name = customerName.trim();
        orderPayload.customer_phone = customerPhone.trim();
        orderPayload.delivery_address = deliveryAddress.trim();
        orderPayload.invoice_note_type = invoiceNoteType;
        orderPayload.invoice_note = invoiceNoteType === 'none' ? undefined : invoiceNoteText;
        if (fulfillmentMethod === 'in_house') {
          orderPayload.delivered_by_staff = deliveredByStaff.trim() || currentUser?.name || 'Staff';
        }
      } else {
        orderPayload.parcel_id = parcelId.trim();
        orderPayload.merchant_id = merchantId.trim() || undefined;
        orderPayload.merchant_name = merchantName.trim() || undefined;
        orderPayload.end_customer_name = endCustomerName.trim() || undefined;
        orderPayload.customer_name = endCustomerName.trim() || merchantName.trim() || 'Merchant Customer';
        orderPayload.customer_phone = customerPhone.trim() || '';
        orderPayload.delivery_address = deliveryAddress.trim() || '';
      }

      const created = await createOrder(orderPayload);
      handleResetForm();
      setSuccessOrder(created);
      if (onOrderCreated) {
        onOrderCreated(created);
      }
    } catch (err: any) {
      alert(`Error creating order: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto px-2 sm:px-4 space-y-3" id="new-order-messenger-view">
      {/* Success Notification Toast */}
      {successOrder && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] p-3 bg-[var(--surface)] border border-[color-mix(in_srgb,var(--status-green)_30%,transparent)] rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-green)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[12px] font-semibold text-[var(--status-green)]">
                {successOrder.order_type === 'merchant_fulfillment'
                  ? 'Merchant Dropship Order Confirmed & Stock Reserved'
                  : 'Direct Order Confirmed & Stock Reserved'}
              </h4>
              <p className="text-[11px] text-[var(--text)] mt-0.5">
                {successOrder.order_type === 'merchant_fulfillment' ? (
                  <>
                    Parcel ID <strong>{successOrder.parcel_id}</strong> (Invoice #{successOrder.invoice_number}) • Merchant: <strong>{successOrder.merchant_name || 'Reseller'}</strong> • End Customer: <strong>{successOrder.end_customer_name || successOrder.customer_name}</strong>
                  </>
                ) : (
                  <>
                    Invoice <strong>{successOrder.invoice_number}</strong> created for <strong>{successOrder.customer_name}</strong> (৳<span className="tabular-nums">{successOrder.total.toLocaleString()}</span>)
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {successOrder.order_type !== 'merchant_fulfillment' && (
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="p-1.5 text-[12px] font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer shadow-xs flex items-center gap-1.5"
                title="Print invoice"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}

            {successOrder.order_type === 'merchant_fulfillment' && (
              <button
                type="button"
                onClick={() => setShowStickerModal(true)}
                className="p-1.5 text-[12px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs flex items-center gap-1.5"
                title="Print merchant sticker"
              >
                <Tag className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setActivePath('/orders')}
              className="p-1.5 text-[12px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
              title="View all orders"
            >
              <Package className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetForm}
              className="p-1.5 text-[12px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
              title="Create another order"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Banner for AI Parser Toggle & Expandable Panel Container */}
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setParserOpen(!parserOpen)}
          className="flex items-center justify-between gap-4 bg-[color-mix(in_srgb,var(--accent)_7%,var(--surface))] border border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] rounded-2xl px-4 py-2.5 shadow-xs transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text)]">Intelligent AI Order Parser</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">Paste your Messenger order and let AI extract customer details and items automatically.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setParserOpen(!parserOpen);
            }}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-xl bg-[var(--accent)] text-white shrink-0 hover:opacity-90 cursor-pointer"
          >
            {parserOpen ? 'Close / Hide' : 'Open AI Parser'}
          </button>
        </div>

        {parserOpen && (
          <>
            {/* Backdrop for clicking outside */}
            <div
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setParserOpen(false)}
            />

            {/* Expandable AI Parser Box */}
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-[14px] font-semibold text-[var(--text)]">Customer Message Parser</h3>
                </div>
                <div className="flex items-center gap-2">
                  {hasParsed && (
                    <button
                      type="button"
                      onClick={() => setRawTextCollapsed(!rawTextCollapsed)}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer mr-2"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{rawTextCollapsed ? 'View Raw Message' : 'Collapse Message'}</span>
                      {rawTextCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setParserOpen(false)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    Close / Hide
                  </button>
                </div>
              </div>

              {hasParsed && rawTextCollapsed ? (
                <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
                      {parserUsed === 'gemini_ai' ? 'Gemini AI' : 'Regex'}
                    </span>
                    <span className="truncate text-[var(--text-secondary)] font-mono text-[11px]">{rawText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRawTextCollapsed(false)}
                    className="text-[var(--accent)] font-semibold hover:underline shrink-0 text-[11px] ml-2"
                  >
                    Edit & Re-parse
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Paste Messenger order message here... (e.g. Arif Islam, 01999033027, House 47 Road 27 Banani, karus gold-2750 taka)"
                    className="w-full p-3 font-sans text-[12px] text-[var(--text)] bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl focus:ring-1 focus:ring-[var(--accent)] focus:outline-hidden"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {hasParsed ? 'Message extracted into review below.' : 'Paste text and click Parse to auto-fill customer and items.'}
                    </span>
                    <div className="flex items-center gap-2">
                      {rawText && (
                        <button
                          type="button"
                          onClick={() => {
                            setRawText('');
                            setHasParsed(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        onClick={handleParse}
                        disabled={!rawText.trim() || isParsing}
                        className="px-4 py-1.5 text-[12px] font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        {isParsing ? 'Parsing...' : 'Parse Message'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {parseError && <p className="text-[11px] text-[var(--status-red)]">{parseError}</p>}
            </div>
          </>
        )}
      </div>

      {/* Main Two-Column Desktop Layout (16:9 optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column: Customer Details, Product Catalog, and Itemized Table (Main Action Area) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Customer Details Form & Order Model */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-[14px] font-semibold text-[var(--text)]">Customer & Order Model</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('direct_sale');
                    setFieldErrors({});
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    orderType === 'direct_sale'
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Direct Sale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('merchant_fulfillment');
                    setFieldErrors({});
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    orderType === 'merchant_fulfillment'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Dropship
                </button>
              </div>
            </div>

            {/* Dropship Specific Fields */}
            {orderType === 'merchant_fulfillment' && (
              <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>External reseller order. Merchant Parcel ID is mandatory.</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Parcel ID <span className="text-[var(--status-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={parcelId}
                      onChange={e => {
                        setParcelId(e.target.value);
                        if (fieldErrors.parcelId) setFieldErrors(prev => ({ ...prev, parcelId: undefined }));
                      }}
                      placeholder="e.g. ALR-78219"
                      className={`w-full px-2.5 py-1.5 bg-[var(--surface)] border rounded-lg text-[12px] text-[var(--text)] ${
                        fieldErrors.parcelId ? 'border-[var(--status-red)] ring-1 ring-[var(--status-red)]' : 'border-[var(--border)]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Merchant Name</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={e => setMerchantName(e.target.value)}
                      placeholder="e.g. Aroma Luxe"
                      className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Merchant ID</label>
                    <input
                      type="text"
                      value={merchantId}
                      onChange={e => setMerchantId(e.target.value)}
                      placeholder="e.g. MER-4409"
                      className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">End Customer Name</label>
                    <input
                      type="text"
                      value={endCustomerName}
                      onChange={e => {
                        setEndCustomerName(e.target.value);
                        if (!customerName) setCustomerName(e.target.value);
                      }}
                      placeholder="e.g. Tanzeem"
                      className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Customer Name {orderType === 'direct_sale' && <span className="text-[var(--status-red)] font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (fieldErrors.customerName) setFieldErrors(prev => ({ ...prev, customerName: undefined }));
                  }}
                  placeholder="e.g. Arif Islam"
                  className={`w-full px-3 py-1.5 bg-[var(--surface-sunken)] border rounded-xl text-[12px] text-[var(--text)] ${
                    fieldErrors.customerName ? 'border-[var(--status-red)] ring-1 ring-[var(--status-red)]' : 'border-[var(--border)]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Mobile Number {orderType === 'direct_sale' && <span className="text-[var(--status-red)] font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    if (fieldErrors.customerPhone) setFieldErrors(prev => ({ ...prev, customerPhone: undefined }));
                  }}
                  placeholder="01XXXXXXXXX"
                  className={`w-full px-3 py-1.5 bg-[var(--surface-sunken)] border rounded-xl text-[12px] text-[var(--text)] tabular-nums ${
                    fieldErrors.customerPhone ? 'border-[var(--status-red)] ring-1 ring-[var(--status-red)]' : 'border-[var(--border)]'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Delivery Address {orderType === 'direct_sale' && <span className="text-[var(--status-red)] font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={e => {
                    setDeliveryAddress(e.target.value);
                    if (fieldErrors.deliveryAddress) setFieldErrors(prev => ({ ...prev, deliveryAddress: undefined }));
                  }}
                  placeholder="House / Road / Area / City / District"
                  className={`w-full px-3 py-1.5 bg-[var(--surface-sunken)] border rounded-xl text-[12px] text-[var(--text)] ${
                    fieldErrors.deliveryAddress ? 'border-[var(--status-red)] ring-1 ring-[var(--status-red)]' : 'border-[var(--border)]'
                  }`}
                />
              </div>

              {existingCustomer && (
                <div className="sm:col-span-2 p-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--text)]">Returning Customer: {existingCustomer.order_count} past orders (৳{existingCustomer.total_spent.toLocaleString()})</span>
                  <StatusBadge status={existingCustomer.risk_flag ? 'risk' : 'delivered'} label={existingCustomer.risk_flag ? 'Risk Flag' : 'Verified'} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Product Catalog & Itemized Table */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-[14px] font-semibold text-[var(--text)]">Products & Catalog</h3>
              </div>
              <div className="relative w-48">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search SKU or name..."
                  className="w-full pl-6 pr-2 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]"
                />
                <Search className="w-3 h-3 text-[var(--text-secondary)] absolute left-2 top-2" />
              </div>
            </div>

            {catalogSearch.trim() && (
              <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-[var(--border)] bg-[var(--surface-sunken)] p-2 rounded-xl border border-[var(--border)]">
                {filteredCatalog.slice(0, 8).map(prod => (
                  <div key={prod.id} className="pt-1 flex items-center justify-between text-[11px]">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-[var(--text)]">{prod.display_name}</span>
                      <span className="text-[var(--text-secondary)] ml-2">৳{prod.selling_price.toLocaleString()} (Avail: {prod.stock_available ?? 0})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddItem(prod);
                        setCatalogSearch('');
                      }}
                      className="px-2 py-0.5 font-bold bg-[var(--accent)] text-white rounded-md cursor-pointer text-[10px]"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                <span>Cart Items ({items.length})</span>
                {fieldErrors.items && <span className="text-[var(--status-red)]">{fieldErrors.items}</span>}
              </div>

              {items.length === 0 ? (
                <div className={`p-5 text-center border rounded-xl text-[12px] ${fieldErrors.items ? 'border-[var(--status-red)] bg-rose-500/10 text-[var(--status-red)]' : 'border-dashed border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {hasParsed ? 'No product lines extracted. Select products from catalog search.' : 'Search catalog above or parse a Messenger order to add items.'}
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[var(--surface-sunken)] border-b border-[var(--border)] text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center w-16">Qty</th>
                        <th className="p-2 text-right w-20">Price</th>
                        <th className="p-2 text-right w-20">Disc</th>
                        <th className="p-2 text-right w-20">Total</th>
                        <th className="p-2 w-8 text-center">✕</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {items.map((it, idx) => {
                        const matchedProd = products.find(p => p.id === it.product_id);
                        const isAvailable = (matchedProd?.stock_available || 0) >= it.quantity;

                        return (
                          <tr key={idx} className="hover:bg-[var(--surface-hover)]">
                            <td className="p-1.5">
                              <select
                                value={it.product_id}
                                onChange={e => handleSelectItemProduct(idx, e.target.value)}
                                className="w-full text-[11px] font-semibold text-[var(--text)] border border-[var(--border)] rounded-md p-1 bg-[var(--surface)]"
                              >
                                {it.product_id && <option value={it.product_id}>{it.product_name}</option>}
                                <optgroup label="Catalog Products">
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.display_name} (৳{p.selling_price.toLocaleString()})</option>
                                  ))}
                                </optgroup>
                              </select>
                              <div className="text-[10px] mt-0.5 text-[var(--text-secondary)]">
                                Avail: <span className={isAvailable ? 'text-[var(--status-green)] font-bold' : 'text-[var(--status-red)] font-bold'}>{matchedProd?.stock_available ?? 0}</span>
                              </div>
                            </td>

                            <td className="p-1.5 text-center">
                              <div className="inline-flex items-center border border-[var(--border)] rounded-md bg-[var(--surface)]">
                                <button type="button" onClick={() => handleUpdateItemQty(idx, -1)} className="px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)] cursor-pointer">-</button>
                                <span className="px-1 tabular-nums font-bold">{it.quantity}</span>
                                <button type="button" onClick={() => handleUpdateItemQty(idx, 1)} className="px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)] cursor-pointer">+</button>
                              </div>
                            </td>

                            <td className="p-1.5 text-right tabular-nums">৳{it.unit_price.toLocaleString()}</td>

                            <td className="p-1.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={it.discount_amount || 0}
                                onChange={e => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  setItems(prev => prev.map((item, i) => i === idx ? { ...item, discount_amount: Math.min(val, item.unit_price * item.quantity) } : item));
                                }}
                                className="w-16 px-1 py-0.5 text-right tabular-nums bg-[var(--surface-sunken)] border border-[var(--border)] rounded text-[11px]"
                              />
                            </td>

                            <td className="p-1.5 text-right tabular-nums font-bold">
                              ৳{Math.max(0, it.unit_price * it.quantity - (it.discount_amount || 0)).toLocaleString()}
                            </td>

                            <td className="p-1.5 text-center">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-[var(--text-secondary)] hover:text-[var(--status-red)] cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compact Selection Controls & Order Summary */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[var(--text)]">Fulfillment & Payment</h3>
              <StatusBadge status={hasParsed ? 'confirmed' : 'pending'} label={hasParsed ? 'Extracted' : 'Standard'} size="sm" />
            </div>

            {reviewMismatchWarning && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{reviewMismatchWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Fulfillment Method</label>
                <select
                  value={fulfillmentMethod}
                  onChange={e => setFulfillmentMethod(e.target.value as FulfillmentMethod)}
                  className="w-full px-2.5 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)] focus:outline-hidden"
                >
                  <option value="steadfast">Steadfast Courier</option>
                  <option value="instant_delivery">Instant Delivery</option>
                  <option value="in_house">In-House Staff</option>
                  <option value="self_pickup">Self-Pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Payment State</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => handlePaymentStateChange('cod')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${
                      paymentState === 'cod' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface-sunken)] text-[var(--text)] border-[var(--border)]'
                    }`}
                  >
                    COD
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentStateChange('prepaid')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${
                      paymentState === 'prepaid' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface-sunken)] text-[var(--text)] border-[var(--border)]'
                    }`}
                  >
                    Prepaid
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text)]">
                <span>Order Timing</span>
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setOrderTiming('today'); setScheduledDate(''); setTimingReason(null); }}
                    className={`px-2 py-0.5 rounded ${orderTiming === 'today' ? 'bg-emerald-600 text-white font-semibold' : 'text-[var(--text-secondary)]'}`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderTiming('scheduled');
                      if (!scheduledDate) {
                        const d = new Date(); d.setDate(d.getDate() + 1);
                        setScheduledDate(d.toISOString().slice(0, 10));
                      }
                    }}
                    className={`px-2 py-0.5 rounded ${orderTiming === 'scheduled' ? 'bg-amber-600 text-white font-semibold' : 'text-[var(--text-secondary)]'}`}
                  >
                    Scheduled
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrderTiming('pre_order'); setScheduledDate(''); }}
                    className={`px-2 py-0.5 rounded ${orderTiming === 'pre_order' ? 'bg-purple-600 text-white font-semibold' : 'text-[var(--text-secondary)]'}`}
                  >
                    Pre-Order
                  </button>
                </div>
              </div>

              {orderTiming === 'scheduled' && (
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Scheduled Date:</span>
                  <input
                    type="date"
                    value={scheduledDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="px-2 py-1 text-[11px] bg-[var(--surface)] border border-amber-500/50 rounded-md text-[var(--text)]"
                  />
                </div>
              )}
            </div>

            {fulfillmentMethod === 'in_house' && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Delivering Staff</label>
                <input
                  type="text"
                  value={deliveredByStaff}
                  onChange={e => setDeliveredByStaff(e.target.value)}
                  placeholder="Staff name"
                  className="w-full px-2.5 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)]"
                />
              </div>
            )}
            {fulfillmentMethod === 'instant_delivery' && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Instant Service</label>
                <select
                  value={instantDeliveryProvider}
                  onChange={e => setInstantDeliveryProvider(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)]"
                >
                  <option value="pathao">Pathao</option>
                  <option value="uber">Uber</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {orderType === 'direct_sale' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text)]">
                  <span>Customer Invoice Note</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => { setInvoiceNoteType('cod'); setInvoiceNoteText(defaultCodTemplate); }} className={`px-2 py-0.5 rounded text-[10px] border ${invoiceNoteType === 'cod' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface-sunken)] text-[var(--text)] border-[var(--border)]'}`}>COD</button>
                    <button type="button" onClick={() => { setInvoiceNoteType('prepaid'); setInvoiceNoteText(defaultPrepaidTemplate); }} className={`px-2 py-0.5 rounded text-[10px] border ${invoiceNoteType === 'prepaid' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface-sunken)] text-[var(--text)] border-[var(--border)]'}`}>Prepaid</button>
                    <button type="button" onClick={() => { setInvoiceNoteType('none'); setInvoiceNoteText(''); }} className={`px-2 py-0.5 rounded text-[10px] border ${invoiceNoteType === 'none' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface-sunken)] text-[var(--text)] border-[var(--border)]'}`}>None</button>
                  </div>
                </div>
                {invoiceNoteType !== 'none' && (
                  <textarea
                    rows={2}
                    value={invoiceNoteText}
                    onChange={e => setInvoiceNoteText(e.target.value)}
                    className="w-full p-2 text-[11px] text-[var(--text)] bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg"
                  />
                )}
              </div>
            )}

            <div className="bg-[var(--surface-sunken)] p-3 rounded-xl border border-[var(--border)] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal:</span>
                <span className="tabular-nums font-semibold text-[var(--text)]">৳{calculatedSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Delivery Charge:</span>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={e => setDeliveryCharge(Number(e.target.value))}
                  className="w-20 px-2 py-0.5 text-right tabular-nums font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px]"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Overall Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="w-20 px-2 py-0.5 text-right tabular-nums font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--status-red)]"
                />
              </div>
              {calculatedItemDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Product Discounts:</span>
                  <span className="tabular-nums font-semibold text-[var(--status-red)]">-৳{calculatedItemDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-2 flex justify-between items-center text-[14px] font-bold text-[var(--accent)]">
                <span>Final Total:</span>
                <span className="tabular-nums text-[16px]">৳{calculatedTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyOrderSummary}
                className="p-2.5 bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Copy Order Summary"
              >
                {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[var(--accent)]" />}
              </button>

              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isSubmitting || items.length === 0}
                className="flex-1 py-2.5 bg-[var(--accent)] text-white text-[13px] font-semibold rounded-xl hover:opacity-90 shadow-xs transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Confirming Order...' : 'Confirm Order & Reserve Stock'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {successOrder && (
        <>
          <InvoiceModal
            order={successOrder}
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
          />
          <MerchantStickerModal
            order={successOrder}
            isOpen={showStickerModal}
            onClose={() => setShowStickerModal(false)}
          />
        </>
      )}
    </div>
  );
};
