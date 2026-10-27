import React, { useState } from 'react';
import { 
  CheckCircle2, ArrowRight, RefreshCw, Calculator, Plus, 
  RotateCcw, ShieldCheck, Layers, BookOpen 
} from 'lucide-react';

export default function VisualTAccountsLedger() {
  // Initial state for 5 core PACS T-Accounts
  const initialAccounts = {
    vaultCash: {
      name: 'Cash in Vault',
      type: 'Asset',
      normalBalance: 'DEBIT',
      debits: [150000, 50000], // opening balance, member deposit
      credits: [42100] // administrative expense
    },
    kccAdvances: {
      name: 'KCC Crop Loan Advances',
      type: 'Asset',
      normalBalance: 'DEBIT',
      debits: [320000],
      credits: [85000] // prompt repayment
    },
    inventoryStock: {
      name: 'Fertilizer & Seed Inventory',
      type: 'Asset',
      normalBalance: 'DEBIT',
      debits: [110000],
      credits: [35000] // stock sold to members
    },
    shareCapital: {
      name: 'Member Share Capital',
      type: 'Equity',
      normalBalance: 'CREDIT',
      debits: [],
      credits: [195000]
    },
    dccbRefinance: {
      name: 'DCCB Refinance Borrowings',
      type: 'Liability',
      normalBalance: 'CREDIT',
      debits: [20000], // installment paid
      credits: [292900]
    }
  };

  const [accounts, setAccounts] = useState(initialAccounts);
  const [lastAction, setLastAction] = useState('Initialized with PACS Opening Ledger');

  // Compute balance for a T-Account
  const getAccountBalance = (acc) => {
    const totalDebits = acc.debits.reduce((a, b) => a + b, 0);
    const totalCredits = acc.credits.reduce((a, b) => a + b, 0);
    if (acc.normalBalance === 'DEBIT') {
      return totalDebits - totalCredits;
    } else {
      return totalCredits - totalDebits;
    }
  };

  // Compute Grand Totals across all accounts for Trial Balance
  const totalDebitsAcrossAll = Object.values(accounts).reduce(
    (sum, acc) => sum + acc.debits.reduce((a, b) => a + b, 0),
    0
  );

  const totalCreditsAcrossAll = Object.values(accounts).reduce(
    (sum, acc) => sum + acc.credits.reduce((a, b) => a + b, 0),
    0
  );

  const isBalanced = totalDebitsAcrossAll === totalCreditsAcrossAll;

  // Sample Transaction Posters
  const postTransaction = (label, debitKey, debitAmt, creditKey, creditAmt) => {
    setAccounts(prev => ({
      ...prev,
      [debitKey]: {
        ...prev[debitKey],
        debits: [...prev[debitKey].debits, debitAmt]
      },
      [creditKey]: {
        ...prev[creditKey],
        credits: [...prev[creditKey].credits, creditAmt]
      }
    }));
    setLastAction(`Posted Voucher: ${label} (Debit ₹${debitAmt.toLocaleString('en-IN')}, Credit ₹${creditAmt.toLocaleString('en-IN')})`);
  };

  const handleReset = () => {
    setAccounts(initialAccounts);
    setLastAction('Reset to standard statutory opening day-book state.');
  };

  return (
    <div className="space-y-5">
      {/* Overview & Action Controls */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Model Byelaws 2023 Compliant
            </span>
            <span className="text-xs font-mono text-slate-500">
              Interactive Double-Entry Ledger
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            PACS Interactive Visual T-Accounts Ledger
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Watch debits and credits post across asset, liability, and equity books in real time.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
        >
          <RotateCcw size={13} />
          <span>Reset Ledger</span>
        </button>
      </div>

      {/* 4 Interactive Voucher Triggers */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Simulate Statutory Voucher Entries (Click to Post)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => postTransaction('KCC Loan Disbursed to Ramkishan Yadav', 'kccAdvances', 150000, 'vaultCash', 150000)}
            className="p-3 text-left rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#2563EB]/40 transition shadow-xs cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] flex items-center justify-between">
              <span>Disburse KCC Loan</span>
              <Plus size={13} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">₹1,50,000 Crop Advance</div>
            <div className="text-[9px] text-[#2563EB] font-mono mt-1">Dr KCC / Cr Vault Cash</div>
          </button>

          <button
            onClick={() => postTransaction('Member Share Capital Subscription', 'vaultCash', 50000, 'shareCapital', 50000)}
            className="p-3 text-left rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#2563EB]/40 transition shadow-xs cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] flex items-center justify-between">
              <span>Member Capital Inflow</span>
              <Plus size={13} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">₹50,000 New Share Sub</div>
            <div className="text-[9px] text-[#2563EB] font-mono mt-1">Dr Vault Cash / Cr Capital</div>
          </button>

          <button
            onClick={() => postTransaction('Godown Fertilizer Stock Purchase', 'inventoryStock', 75000, 'vaultCash', 75000)}
            className="p-3 text-left rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#2563EB]/40 transition shadow-xs cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] flex items-center justify-between">
              <span>Fertilizer Stock Procure</span>
              <Plus size={13} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">₹75,000 Urea/DAP Bags</div>
            <div className="text-[9px] text-[#2563EB] font-mono mt-1">Dr Inventory / Cr Vault</div>
          </button>

          <button
            onClick={() => postTransaction('DCCB Refinancing Line Drawdown', 'vaultCash', 200000, 'dccbRefinance', 200000)}
            className="p-3 text-left rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#2563EB]/40 transition shadow-xs cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] flex items-center justify-between">
              <span>DCCB Refinance Line</span>
              <Plus size={13} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">₹2,00,000 Refinance Draw</div>
            <div className="text-[9px] text-[#2563EB] font-mono mt-1">Dr Vault / Cr DCCB Loan</div>
          </button>
        </div>
      </div>

      {/* Visual T-Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(accounts).map(([key, acc]) => {
          const balance = getAccountBalance(acc);
          const totalDeb = acc.debits.reduce((a, b) => a + b, 0);
          const totalCred = acc.credits.reduce((a, b) => a + b, 0);

          return (
            <div key={key} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                {/* Account Title Bar */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">{acc.name}</h4>
                    <span className="text-[9px] uppercase font-bold text-slate-400">{acc.type} ({acc.normalBalance} Normal)</span>
                  </div>
                  <span className="text-xs font-mono font-black text-[#2563EB]">
                    ₹{balance.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Classic T-Account Structure (Debit Left | Credit Right) */}
                <div className="grid grid-cols-2 divide-x divide-slate-300 text-[11px] font-mono min-h-[110px]">
                  {/* Left: Debit Side */}
                  <div className="pr-2 space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase pb-0.5 border-b border-slate-100">
                      Dr. (Debit)
                    </div>
                    {acc.debits.map((d, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>+{idx + 1}</span>
                        <span>₹{d.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right: Credit Side */}
                  <div className="pl-2 space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase pb-0.5 border-b border-slate-100">
                      Cr. (Credit)
                    </div>
                    {acc.credits.map((c, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>-{idx + 1}</span>
                        <span>₹{c.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Sub-Totals */}
              <div className="pt-2.5 mt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Total Dr: ₹{totalDeb.toLocaleString('en-IN')}</span>
                <span>Total Cr: ₹{totalCred.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trial Balance Auto-Audit Strip */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isBalanced ? 'bg-blue-50/70 border-blue-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold shrink-0">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Statutory Trial Balance Audit Status: {isBalanced ? 'BALANCED' : 'OUT_OF_BALANCE'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                Zero Variance
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
              Grand Total Debits: <strong className="text-slate-900">₹{totalDebitsAcrossAll.toLocaleString('en-IN')}</strong> | Grand Total Credits: <strong className="text-slate-900">₹{totalCreditsAcrossAll.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic max-w-xs text-right shrink-0">
          {lastAction}
        </div>
      </div>
    </div>
  );
}
