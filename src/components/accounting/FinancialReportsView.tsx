import { PageHeader } from '../common/PageHeader';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Scale,
  DollarSign,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ProfitLossReport, BalanceSheetReport } from '../../types';

export const FinancialReportsView: React.FC = () => {
  const {
    pnlReport,
    balanceSheetReport,
    accounts,
    journalEntries,
    fetchPnlReport,
    fetchBalanceSheetReport,
    refreshAll,
  } = useApp();
  const { can } = useAuth();

  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'balance_sheet' | 'trial_balance'>('pnl');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPnlReport().catch((e) => console.warn('P&L load error:', e));
    fetchBalanceSheetReport().catch((e) => console.warn('Balance Sheet load error:', e));
  }, []);

  const handleFilterPnl = async () => {
    setIsLoading(true);
    try {
      await fetchPnlReport(startDate, endDate);
      await fetchBalanceSheetReport();
    } catch (e) {
      console.warn('Filter error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  // Trial Balance calculation from Accounts
  const trialBalanceAccounts = safeAccounts.map((acc) => {
    const isDebit = acc.type === 'asset' || acc.type === 'expense';
    const debit = isDebit ? Math.max(0, acc.balance) : 0;
    const credit = !isDebit ? Math.max(0, acc.balance) : 0;
    return {
      ...acc,
      debit,
      credit,
    };
  });

  const totalTbDebit = trialBalanceAccounts.reduce((s, a) => s + a.debit, 0);
  const totalTbCredit = trialBalanceAccounts.reduce((s, a) => s + a.credit, 0);
  const isTbBalanced = Math.abs(totalTbDebit - totalTbCredit) < 1;

  return (
    <div className="space-y-6" id="financial-reports-view">
      {/* Top Header */}
      <PageHeader
        eyebrow="Finance & Control"
        title="Profit & Loss"
        desc="Recognized sales revenue, landed-cost COGS, and operating expense breakdown"
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeReportTab === 'pnl'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss Statement (P&L)
        </button>

        <button
          onClick={() => setActiveReportTab('balance_sheet')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeReportTab === 'balance_sheet'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Scale className="w-4 h-4" />
          Balance Sheet
        </button>

        <button
          onClick={() => setActiveReportTab('trial_balance')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeReportTab === 'trial_balance'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Trial Balance ({accounts.length} Accounts)
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS STATEMENT */}
      {activeReportTab === 'pnl' && pnlReport && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-medium">Net Sales Revenue</span>
                <DollarSign className="w-4 h-4 text-[var(--status-green)]" />
              </div>
              <div className="text-2xl font-bold text-[var(--text)]">
                &#2547;{pnlReport.revenue.net_revenue.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                Gross: &#2547;{(pnlReport.revenue.product_sales + pnlReport.revenue.delivery_income).toLocaleString()} &#8226; Returns: &#2547;{pnlReport.revenue.sales_returns.toLocaleString()}
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-medium">Gross Profit</span>
                <TrendingUp className="w-4 h-4 text-[var(--status-teal)]" />
              </div>
              <div className="text-2xl font-bold text-[var(--status-teal)]">
                &#2547;{pnlReport.gross_profit.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                Gross Margin: <span className="font-bold">{pnlReport.gross_margin_percent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-medium">Total Operating Expenses</span>
                <ArrowDownRight className="w-4 h-4 text-[var(--status-amber)]" />
              </div>
              <div className="text-2xl font-bold text-[var(--status-amber)]">
                &#2547;{pnlReport.operating_expenses.total_operating_expenses.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Overheads & rent commitment</div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-medium">Net Operating Profit</span>
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className={`text-2xl font-black ${pnlReport.net_operating_profit >= 0 ? 'text-[var(--status-green)]' : 'text-[var(--status-red)]'}`}>
                &#2547;{pnlReport.net_operating_profit.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                Net Margin: <span className="font-bold">{pnlReport.net_margin_percent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="dense-table-container">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-sunken)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Statement of Comprehensive Income (P&L)</h3>
                <p className="text-xs text-[var(--text-muted)]">Period: {pnlReport.period}</p>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs font-sans">
              {/* REVENUE SECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 font-bold text-[var(--text)] border-b border-[var(--border)] uppercase text-[11px]">
                  <span>1. Revenue & Inflows</span>
                  <span>Amount (BDT)</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Product Perfume Sales (Account 4010)</span>
                  <span className="font-mono text-[var(--text)] font-semibold">&#2547;{pnlReport.revenue.product_sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Customer Delivery Fee Income (Account 4020)</span>
                  <span className="font-mono text-[var(--text)] font-semibold">&#2547;{pnlReport.revenue.delivery_income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--status-red)]">
                  <span>Less: Sales Returns & Customer Refunds (Account 4030)</span>
                  <span className="font-mono font-semibold">-&#2547;{pnlReport.revenue.sales_returns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-[var(--text)] border-t border-dashed border-[var(--border)]">
                  <span>Net Sales Revenue</span>
                  <span className="font-mono font-bold text-sm">&#2547;{pnlReport.revenue.net_revenue.toLocaleString()}</span>
                </div>
              </div>

              {/* COGS SECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 font-bold text-[var(--text)] border-b border-[var(--border)] uppercase text-[11px]">
                  <span>2. Cost of Goods Sold (COGS)</span>
                  <span>Amount (BDT)</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Weighted Average Landed Inventory Cost of Bottles Sold (Account 5010)</span>
                  <span className="font-mono text-[var(--status-red)] font-semibold">-&#2547;{pnlReport.cogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 font-black text-[var(--status-teal)] border-t border-[var(--border)] bg-[var(--surface-sunken)] px-3 rounded-lg text-sm">
                  <span>Gross Operating Profit (Gross Margin {pnlReport.gross_margin_percent.toFixed(1)}%)</span>
                  <span className="font-mono font-black">&#2547;{pnlReport.gross_profit.toLocaleString()}</span>
                </div>
              </div>

              {/* OPERATING EXPENSES SECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 font-bold text-[var(--text)] border-b border-[var(--border)] uppercase text-[11px]">
                  <span>3. Operating Expenses</span>
                  <span>Amount (BDT)</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Banani Showroom & Office Rent (Account 6010)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.rent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Employee Salaries & Compensation (Account 6020)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.salaries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Steadfast Courier Freight & RTO Return Fees (Account 6030)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.courier_freight_rto.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Showroom Tester & Marketing Bottles (Account 6040)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.showroom_testers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Damaged & Broken Stock Loss (Account 6050)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.damaged_stock_loss.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>DESCO Electricity, Fiber Internet & Utilities (Account 6060)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.utilities_office.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Meta Ads & Influencer PR Marketing (Account 6070)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.marketing_ads.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Packaging Boxes, Bubble Wrap & Tape (Account 6080)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.packing_supplies.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-[var(--text-muted)]">
                  <span>Daily Cash Till Shortage Loss (Account 6100)</span>
                  <span className="font-mono text-[var(--text)]">&#2547;{pnlReport.operating_expenses.cash_shortage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-[var(--status-amber)] border-t border-dashed border-[var(--border)]">
                  <span>Total Operating Overheads</span>
                  <span className="font-mono font-bold">&#2547;{pnlReport.operating_expenses.total_operating_expenses.toLocaleString()}</span>
                </div>
              </div>

              {/* NET OPERATING PROFIT */}
              <div className="flex justify-between items-center py-4 px-4 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl font-bold text-base">
                <div>
                  <span>Net Operating Profit (EBITDA)</span>
                  <span className="block text-xs font-normal text-[var(--text-muted)]">
                    Net Margin: {pnlReport.net_margin_percent.toFixed(1)}% of Revenue
                  </span>
                </div>
                <span className="font-mono text-xl font-black text-[var(--status-green)]">
                  &#2547;{pnlReport.net_operating_profit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeReportTab === 'balance_sheet' && balanceSheetReport && (
        <div className="space-y-6">
          <div className="dense-table-container">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-sunken)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Balance Sheet (Statement of Financial Position)</h3>
                <p className="text-xs text-[var(--text-muted)]">As of {balanceSheetReport.as_of_date}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${balanceSheetReport.is_balanced ? 'bg-[color-mix(in_srgb,var(--status-green)_10%,transparent)] text-[var(--status-green)]' : 'bg-[color-mix(in_srgb,var(--status-red)_10%,transparent)] text-[var(--status-red)]'}`}>
                  {balanceSheetReport.is_balanced ? '\u2705 Balanced (Assets = Liabilities + Equity)' : '\u274C Out of Balance'}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-sans">
              {/* ASSETS COLUMN */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 font-bold text-[var(--text)] border-b border-[var(--border)] uppercase text-[11px]">
                  <span>Assets</span>
                  <span>Amount (BDT)</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Cash in Hand (Showroom Till)</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.assets.cash_in_hand.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>City Bank Operating Account</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.assets.bank_deposits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>MFS Wallets (bKash & Nagad Merchant)</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.assets.mfs_wallets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Courier Receivable (Steadfast Clearing)</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.assets.courier_receivable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Perfume Inventory Valuation (On-Hand Stock)</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.assets.inventory_valuation.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 px-3 bg-[var(--surface-sunken)] rounded-lg font-black text-sm text-[var(--accent)] border border-[var(--border)]">
                  <span>Total Assets</span>
                  <span className="font-mono">&#2547;{balanceSheetReport.assets.total_assets.toLocaleString()}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY COLUMN */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 font-bold text-[var(--text)] border-b border-[var(--border)] uppercase text-[11px]">
                  <span>Liabilities & Equity</span>
                  <span>Amount (BDT)</span>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-[var(--text)] uppercase text-[10px] tracking-wider text-[var(--text-muted)]">Liabilities</p>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Dubai Supplier Payables (AED/EUR/USD)</span>
                    <span className="font-mono text-[var(--status-red)] font-semibold">&#2547;{balanceSheetReport.liabilities.supplier_payables.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--text)] border-t border-dashed border-[var(--border)]">
                    <span>Total Liabilities</span>
                    <span className="font-mono">&#2547;{balanceSheetReport.liabilities.total_liabilities.toLocaleString()}</span>
                  </div>

                  <p className="font-bold text-[var(--text)] uppercase text-[10px] tracking-wider text-[var(--text-muted)] pt-2">Owner Equity</p>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Owner Capital & Opening Equity</span>
                    <span className="font-mono text-[var(--text)] font-semibold">&#2547;{balanceSheetReport.equity.owner_capital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span>Current Retained Earnings (YTD Net Profit)</span>
                    <span className="font-mono text-[var(--status-green)] font-semibold">&#2547;{balanceSheetReport.equity.current_retained_earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--text)] border-t border-dashed border-[var(--border)]">
                    <span>Total Equity</span>
                    <span className="font-mono">&#2547;{balanceSheetReport.equity.total_equity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 px-3 bg-[var(--surface-sunken)] rounded-lg font-black text-sm text-[var(--accent)] border border-[var(--border)]">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono">&#2547;{(balanceSheetReport.liabilities.total_liabilities + balanceSheetReport.equity.total_equity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeReportTab === 'trial_balance' && (
        <div className="space-y-4">
          <div className="dense-table-container">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-sunken)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Chart of Accounts Trial Balance</h3>
                <p className="text-xs text-[var(--text-muted)]">Summary of debit and credit balances for all accounts</p>
              </div>

              <span className={`px-2.5 py-1 rounded text-xs font-bold ${isTbBalanced ? 'bg-[color-mix(in_srgb,var(--status-green)_10%,transparent)] text-[var(--status-green)]' : 'bg-[color-mix(in_srgb,var(--status-red)_10%,transparent)] text-[var(--status-red)]'}`}>
                {isTbBalanced ? 'Balanced Ledger' : 'Discrepancy Detected'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="dense-table">
                <thead className="bg-[var(--surface-sunken)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Debit Balance (&#2547;)</th>
                    <th className="py-3 px-4 text-right">Credit Balance (&#2547;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono">
                  {trialBalanceAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 px-4 font-bold text-[var(--accent)]">{acc.code}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-[var(--text)]">{acc.name}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--surface-sunken)] border border-[var(--border)]">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--text)]">
                        {acc.debit > 0 ? `\u09F3${acc.debit.toLocaleString()}` : '\u2014'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--text)]">
                        {acc.credit > 0 ? `\u09F3${acc.credit.toLocaleString()}` : '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--surface-sunken)] font-black text-xs border-t-2 border-[var(--border)]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase">Total Trial Balance</td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--status-green)] text-sm">
                      &#2547;{totalTbDebit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--status-green)] text-sm">
                      &#2547;{totalTbCredit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
