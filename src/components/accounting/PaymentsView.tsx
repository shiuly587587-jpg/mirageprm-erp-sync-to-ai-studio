import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { JournalEntry, Account } from '../../types';
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  RefreshCw,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface PaymentItem {
  id: string;
  date: string;
  type: 'inflow' | 'outflow';
  category: string;
  method: 'cash' | 'bank' | 'bkash' | 'nagad';
  amount: number;
  reference: string;
  description: string;
  actor: string;
  account: string;
}

export const PaymentsView: React.FC = () => {
  const { sessionToken } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<'all' | 'cash' | 'bank' | 'bkash' | 'nagad'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('mirage_session_token') : null);
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-session-token': token } : {};
      const [journalRes, accountsRes] = await Promise.all([
        fetch('/api/accounting/journal', { headers }),
        fetch('/api/accounting/accounts', { headers }),
      ]);

      if (journalRes.ok) {
        const jData = await journalRes.json();
        setJournalEntries(Array.isArray(jData) ? jData : []);
      }
      if (accountsRes.ok) {
        const aData = await accountsRes.json();
        setAccounts(Array.isArray(aData) ? aData : []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionToken]);

  // Transform Journal Entries into individual payment transactions
  const payments: PaymentItem[] = useMemo(() => {
    const list: PaymentItem[] = [];

    (journalEntries || []).forEach((entry) => {
      if (!entry || !Array.isArray(entry.lines)) return;
      // Find cash or bank account line
      entry.lines.forEach((line, idx) => {
        if (!line || !line.account_id) return;
        const isCashOrBank =
          line.account_id.includes('cash') ||
          line.account_id.includes('bank') ||
          line.account_id.includes('bkash') ||
          line.account_id.includes('nagad') ||
          line.account_id === 'acc_cash' ||
          line.account_id === 'acc_bank';

        if (isCashOrBank && ((line.debit || 0) > 0 || (line.credit || 0) > 0)) {
          let method: 'cash' | 'bank' | 'bkash' | 'nagad' = 'cash';
          if (line.account_id.includes('bank')) method = 'bank';
          else if (line.account_id.includes('bkash')) method = 'bkash';
          else if (line.account_id.includes('nagad')) method = 'nagad';

          const isInflow = (line.debit || 0) > 0;
          const amount = isInflow ? line.debit : line.credit;

          list.push({
            id: `${entry.id}-${idx}`,
            date: entry.date || '',
            type: isInflow ? 'inflow' : 'outflow',
            category: 'Journal Transaction',
            method,
            amount: amount || 0,
            reference: entry.reference_id || entry.entry_number || entry.id,
            description: entry.description || line.line_desc || 'Payment transaction',
            actor: entry.created_by_name || entry.created_by || 'System',
            account: line.account_name || line.account_id,
          });
        }
      });
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [journalEntries]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (channelFilter !== 'all' && p.method !== channelFilter) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchRef = p.reference.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchActor = p.actor.toLowerCase().includes(q);
        if (!matchRef && !matchDesc && !matchActor) return false;
      }

      return true;
    });
  }, [payments, channelFilter, typeFilter, searchQuery]);

  const summary = useMemo(() => {
    let totalInflows = 0;
    let totalOutflows = 0;

    payments.forEach((p) => {
      if (p.type === 'inflow') totalInflows += p.amount;
      else totalOutflows += p.amount;
    });

    const netCashFlow = totalInflows - totalOutflows;

    return {
      totalInflows,
      totalOutflows,
      netCashFlow,
      totalCount: payments.length,
    };
  }, [payments]);

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Method', 'Reference', 'Description', 'Account', 'Amount (BDT)', 'Processed By'];
    const rows = filteredPayments.map(p => [
      p.date,
      p.type.toUpperCase(),
      p.method.toUpperCase(),
      `"${p.reference}"`,
      `"${p.description}"`,
      `"${p.account}"`,
      p.type === 'inflow' ? p.amount : -p.amount,
      `"${p.actor}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mirage_Payments_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Payments & Cash Flow Ledger</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Double-Entry Audited
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Complete transaction registry of incoming receipts, courier COD payouts, supplier payments, and operational disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]/10 text-[var(--text-muted)] hover:text-[var(--text)] transition-all cursor-pointer"
            title="Refresh payment records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--accent)]/10 text-xs font-semibold rounded-lg text-[var(--text)] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Inflows (Receipts)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-500 font-mono">৳{summary.totalInflows.toLocaleString()}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Customer sales, COD collections & capital
          </div>
        </div>

        <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Outflows (Disbursements)</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-500 font-mono">৳{summary.totalOutflows.toLocaleString()}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Supplier PO payments, payroll & expenses
          </div>
        </div>

        <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span className="font-semibold uppercase tracking-wider">Net Cash Position</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${summary.netCashFlow >= 0 ? 'text-[var(--text)]' : 'text-rose-500'}`}>
            ৳{summary.netCashFlow.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Net liquid funds across all registered channels
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)] text-xs">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              typeFilter === 'all' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            All Flows
          </button>
          <button
            onClick={() => setTypeFilter('inflow')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              typeFilter === 'inflow' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Inflows (Receipts)
          </button>
          <button
            onClick={() => setTypeFilter('outflow')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              typeFilter === 'outflow' ? 'bg-rose-600 text-white font-semibold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Outflows (Payments)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)] text-xs">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                channelFilter === 'all' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              All Methods
            </button>
            <button
              onClick={() => setChannelFilter('cash')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                channelFilter === 'cash' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setChannelFilter('bank')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                channelFilter === 'bank' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Bank
            </button>
            <button
              onClick={() => setChannelFilter('bkash')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                channelFilter === 'bkash' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              bKash
            </button>
            <button
              onClick={() => setChannelFilter('nagad')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                channelFilter === 'nagad' ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Nagad
            </button>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference or memo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Payment Transaction Stream</h3>
            <p className="text-xs text-[var(--text-muted)]">Reconciled against chart of accounts bank & cash ledgers</p>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{filteredPayments.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text)]">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Flow</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Description / Memo</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Staff Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                    No payment transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--accent)]/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                      {p.date.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        p.type === 'inflow'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {p.type === 'inflow' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {p.type === 'inflow' ? 'Inflow' : 'Outflow'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold uppercase text-[10px] tracking-wide text-[var(--text-muted)]">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[var(--accent)]">
                      {p.reference}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[var(--text)]">
                      {p.description}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)] text-[11px]">
                      {p.account}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      p.type === 'inflow' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {p.type === 'inflow' ? '+' : '-'}৳{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)] text-[11px]">
                      {p.actor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
