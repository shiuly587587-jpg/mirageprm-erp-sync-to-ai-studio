import React, { useState } from "react";
import {
  History,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  Gift,
  FlaskConical,
  Truck,
  X,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { StockMovementReason } from "../../types";
import { PageHeader } from "../common/PageHeader";

export const StockLedgerView: React.FC = () => {
  const { stockMovements, products, postMovement } = useApp();
  const { can } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [selectedProdId, setSelectedProdId] = useState<string>(products[0]?.id || "");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("wh_shop");
  const [adjReason, setAdjReason] = useState<StockMovementReason>("DAMAGE");
  const [adjQuantity, setAdjQuantity] = useState<number>(1);
  const [adjNotes, setAdjNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredMovements = stockMovements.filter((m) => {
    if (reasonFilter !== "all" && m.movement_reason !== reasonFilter) return false;
    if (warehouseFilter !== "all" && m.warehouse_id !== warehouseFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mName = m.product_name.toLowerCase();
      const mSku = m.sku.toLowerCase();
      const mNotes = (m.notes || "").toLowerCase();
      const mRef = (m.reference_id || "").toLowerCase();
      if (!mName.includes(q) && !mSku.includes(q) && !mNotes.includes(q) && !mRef.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || adjQuantity <= 0) {
      setErrorMsg("Please select a product and valid positive quantity.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isOutflow = [
        "SALE",
        "DAMAGE",
        "LOSS",
        "MARKETING_SAMPLE",
        "GIFT",
        "TESTER_CONVERSION",
      ].includes(adjReason);

      const delta = isOutflow ? -Math.abs(adjQuantity) : Math.abs(adjQuantity);

      await postMovement({
        product_id: selectedProdId,
        warehouse_id: selectedWarehouseId,
        quantity_delta: delta,
        movement_reason: adjReason,
        notes: adjNotes || `Manual movement: ${adjReason}`,
      });

      setSuccessMsg(`Successfully logged stock movement (${adjReason}).`);
      setTimeout(() => {
        setShowAdjustModal(false);
        setSuccessMsg(null);
        setAdjNotes("");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonPillClass = (reason: StockMovementReason) => {
    switch (reason) {
      case "PURCHASE":
      case "OPENING_BALANCE":
        return "pill-green";
      case "SALE":
        return "pill-gray";
      case "TRANSFER":
        return "pill-teal";
      case "DAMAGE":
      case "LOSS":
        return "pill-red";
      case "TESTER_CONVERSION":
      case "MARKETING_SAMPLE":
      case "GIFT":
        return "pill-amber";
      case "RETURN":
        return "pill-teal";
      default:
        return "pill-gray";
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Inventory"
        title="Stock Ledger"
        desc="Immutable movement-based inventory audit trail &#183; all stock adjustments, sales, and shipments"
        actions={
          can("adjust_stock") ? (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="erp-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Movement / Adjustment</span>
            </button>
          ) : undefined
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, product, ref..."
            className="erp-input pl-8 w-64"
          />
        </div>

        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="erp-select"
        >
          <option value="all">All Movement Reasons</option>
          <option value="PURCHASE">PURCHASE (Shipment In)</option>
          <option value="SALE">SALE (Order / POS)</option>
          <option value="TRANSFER">TRANSFER (Inter-wh)</option>
          <option value="DAMAGE">DAMAGE (Broken bottle)</option>
          <option value="LOSS">LOSS (Shrinkage / Theft)</option>
          <option value="TESTER_CONVERSION">TESTER CONVERSION</option>
          <option value="MARKETING_SAMPLE">MARKETING / PR SAMPLE</option>
          <option value="GIFT">VIP GIFT</option>
          <option value="RETURN">RETURN (Restocked)</option>
          <option value="OPENING_BALANCE">OPENING BALANCE</option>
          <option value="ADJUSTMENT">AUDIT ADJUSTMENT</option>
        </select>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="erp-select"
        >
          <option value="all">All Warehouses</option>
          <option value="wh_shop">Shop Floor (Showroom)</option>
          <option value="wh_main">Main / Back-store</option>
        </select>

        <span className="ml-auto text-[11px] text-[var(--text-muted)] font-num">
          {filteredMovements.length} logged movements
        </span>
      </div>

      {/* Movement Ledger Table */}
      <div className="dense-table-container">
        <div className="overflow-x-auto">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Product / SKU</th>
                <th>Warehouse</th>
                <th>Reason</th>
                <th className="text-center">Qty Delta</th>
                <th className="text-right">Unit Cost</th>
                <th className="text-right">Total Impact</th>
                <th>Reference & Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                    No stock movements recorded matching filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.quantity_delta > 0;
                  return (
                    <tr key={m.id}>
                      {/* Timestamp */}
                      <td className="font-num text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Product & SKU */}
                      <td>
                        <div className="font-semibold text-[var(--text)]">{m.product_name}</div>
                        <div className="font-num text-[10px] text-[var(--accent)]">
                          SKU: {m.sku}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[10px] font-medium">
                          {m.warehouse_name}
                        </span>
                      </td>

                      {/* Reason */}
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${getReasonPillClass(
                            m.movement_reason
                          )}`}
                        >
                          {m.movement_reason.replace("_", " ")}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className="text-center font-num font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] ${
                            isPositive
                              ? "text-[var(--status-green)] bg-[color-mix(in_srgb,var(--status-green)_10%,transparent)]"
                              : "text-[var(--status-red)] bg-[color-mix(in_srgb,var(--status-red)_10%,transparent)]"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {m.quantity_delta}
                        </span>
                      </td>

                      {/* Unit Valuation */}
                      <td className="text-right font-num text-[var(--text-muted)]">
                        {can("view_cost_margin") ? `\u09F3${m.unit_cost.toLocaleString()}` : "\u2022\u2022\u2022\u2022"}
                      </td>

                      {/* Total Impact */}
                      <td className="text-right font-num font-semibold text-[var(--accent)]">
                        {can("view_cost_margin")
                          ? `\u09F3${Math.abs(m.total_cost).toLocaleString()}`
                          : "\u2022\u2022\u2022\u2022"}
                      </td>

                      {/* Reference / Notes */}
                      <td className="text-[11px] text-[var(--text-muted)] max-w-xs">
                        {m.reference_id && (
                          <div className="font-num font-bold text-[var(--accent)] truncate">
                            Ref: {m.reference_id}
                          </div>
                        )}
                        <div>{m.notes || "\u2014"}</div>
                        <div className="text-[10px] text-[var(--text-muted)]/80 mt-0.5">
                          By: {m.created_by_name}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Movement Modal */}
      {showAdjustModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(22, 50, 79, 0.10)" }}
          onClick={() => setShowAdjustModal(false)}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl shadow-xl max-w-md w-full p-5 border border-[var(--border)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text)]">Record Stock Movement / Deduction</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-[color-mix(in_srgb,var(--status-red)_10%,transparent)] border border-[color-mix(in_srgb,var(--status-red)_25%,transparent)] text-[var(--status-red)] rounded-lg text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-[color-mix(in_srgb,var(--status-green)_10%,transparent)] border border-[color-mix(in_srgb,var(--status-green)_25%,transparent)] text-[var(--status-green)] rounded-lg text-xs font-semibold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreateAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Select Product SKU
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="erp-select w-full font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.display_name} (Cost: &#2547;{p.avg_cost})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="erp-select w-full"
                  >
                    <option value="wh_shop">Shop Floor (Showroom)</option>
                    <option value="wh_main">Main / Back-store</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Movement Reason
                  </label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value as StockMovementReason)}
                    className="erp-select w-full font-semibold"
                  >
                    <option value="DAMAGE">DAMAGE (Broken bottle)</option>
                    <option value="LOSS">LOSS (Shrinkage / Unaccounted)</option>
                    <option value="TESTER_CONVERSION">TESTER CONVERSION (Showroom display)</option>
                    <option value="MARKETING_SAMPLE">MARKETING / PR SAMPLE (Influencer)</option>
                    <option value="GIFT">VIP COMPLIMENTARY GIFT</option>
                    <option value="ADJUSTMENT">AUDIT STOCK ADJUSTMENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(Number(e.target.value))}
                  className="erp-input w-full font-num font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Audit Notes / Reason Description
                </label>
                <textarea
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="Explain why this stock was converted or deducted..."
                  className="erp-input w-full resize-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="erp-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="erp-btn-primary"
                >
                  {isSubmitting ? "Posting..." : "Record Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
