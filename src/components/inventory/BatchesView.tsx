import React, { useMemo, useState } from 'react';
import { Layers, PackageX, Search, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

// Point 2: Batch/lot (maturity) history + damaged stock (source/severity).
// Batches are sub-records of a product \u2014 a product keeps one pooled stock
// record; batches only track the "where did this shipment come from" detail
// (Section 21 + Point 2.1: maturity indicator, never a hard sell-block).
export const BatchesView: React.FC = () => {
  const { batches, damagedStock, products } = useApp();
  const { can } = useAuth();
  const [tab, setTab] = useState<'batches' | 'damaged'>('batches');
  const [search, setSearch] = useState('');

  const productName = (id: string) => products.find(p => p.id === id)?.display_name || 'Unknown product';

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(b =>
      (b.batch_code || '').toLowerCase().includes(q) ||
      productName(b.product_id).toLowerCase().includes(q)
    );
  }, [batches, search, products]);

  const filteredDamaged = useMemo(() => {
    if (!search.trim()) return damagedStock;
    const q = search.toLowerCase();
    return damagedStock.filter(d =>
      productName(d.product_id).toLowerCase().includes(q) ||
      (d.batch_code || '').toLowerCase().includes(q)
    );
  }, [damagedStock, search, products]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Batches &amp; Damaged Stock</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Batch = maturity/authenticity sub-record (Section 21); Damaged = non-sellable units (source: import / return / in-house).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
          <button
            onClick={() => setTab('batches')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${tab === 'batches' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Batches ({batches.length})
          </button>
          <button
            onClick={() => setTab('damaged')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${tab === 'damaged' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}
          >
            <PackageX className="w-3.5 h-3.5" /> Damaged Stock ({damagedStock.length})
          </button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product or batch code..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <div className="dense-table-container">
        <div className="overflow-x-auto">
          {tab === 'batches' ? (
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Quantity Remaining</th>
                  <th>Mfg Date</th>
                  <th>Import Date</th>
                  <th>Unit Cost</th>
                  <th>Authenticity</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(b => {
                  const daysOld = b.import_date
                    ? Math.max(0, Math.floor((Date.now() - new Date(b.import_date).getTime()) / 86400000))
                    : null;
                  return (
                    <tr key={b.id} className="dense-table-row">
                      <td className="font-mono font-semibold text-[var(--accent)]">{b.batch_code}</td>
                      <td>{productName(b.product_id)}</td>
                      <td className="text-[var(--text-muted)]">{b.warehouse_name || '\u2014'}</td>
                      <td className="font-num">{b.quantity_remaining} / {b.quantity_received}</td>
                      <td className="font-num text-[var(--text-muted)]">{b.manufacturing_date ? new Date(b.manufacturing_date).toLocaleDateString() : '\u2014'}</td>
                      <td className="font-num text-[var(--text-muted)]">
                        {b.import_date ? new Date(b.import_date).toLocaleDateString() : '\u2014'}
                        {daysOld !== null && (
                          <span className="ml-1 text-[10px] text-[var(--text-muted)]">({daysOld}d maturity)</span>
                        )}
                      </td>
                      <td className="font-num text-right">{b.purchase_cost !== undefined ? `\u09F3${b.purchase_cost.toLocaleString()}` : '\u2014'}</td>
                      <td>
                        <span className={`pill-${b.authenticity_status === 'verified' ? 'green' : b.authenticity_status === 'questionable' ? 'red' : 'gray'} inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border capitalize`}>
                          {b.authenticity_status || 'n/a'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredBatches.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" /> No batches recorded yet &#8212; add batch info when receiving a shipment.
                  </td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Batch</th>
                  <th>Warehouse</th>
                  <th>Notes</th>
                  <th>Logged</th>
                </tr>
              </thead>
              <tbody>
                {filteredDamaged.map(d => (
                  <tr key={d.id} className="dense-table-row">
                    <td>{d.product_name || productName(d.product_id)}</td>
                    <td className="font-num font-semibold text-[var(--status-red)]">{d.quantity}</td>
                    <td>
                      <span className={`pill-${d.severity === 'heavy' ? 'red' : d.severity === 'medium' ? 'amber' : 'gray'} inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border capitalize`}>
                        {d.severity}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border pill-teal capitalize">{d.source}</span>
                    </td>
                    <td className="font-mono text-[var(--text-muted)]">{d.batch_code || '\u2014'}</td>
                    <td className="text-[var(--text-muted)]">{d.warehouse_id === 'wh_main' ? 'Main / Back-store' : d.warehouse_id === 'wh_shop' ? 'Shop Floor' : d.warehouse_id}</td>
                    <td className="max-w-[240px] truncate text-[var(--text-muted)]" title={d.notes}>{d.notes || '\u2014'}</td>
                    <td className="font-num text-[var(--text-muted)]">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '\u2014'}</td>
                  </tr>
                ))}
                {filteredDamaged.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" /> No damaged stock recorded.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] font-num">
          {tab === 'batches' ? `${filteredBatches.length} batches` : `${filteredDamaged.length} damaged records`}
        </div>
      </div>
    </div>
  );
};