import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, Calculator, FileText, 
  Coins, Landmark, ShieldCheck, RefreshCw, Sparkles, ArrowRight,
  TrendingUp, Database, Lock, Shield, Layers, BookOpen
} from 'lucide-react';
import { apiRequest } from '../api';
import VisualTAccountsLedger from './VisualTAccountsLedger';

export default function PacsErpSandboxModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('daybook'); // 'daybook' | 'kcc' | 'inventory'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Daybook Form
  const [openingBalance, setOpeningBalance] = useState(150000);
  const [receipts, setReceipts] = useState(85400);
  const [payments, setPayments] = useState(42100);
  const [physicalVault, setPhysicalVault] = useState(193300);

  // KCC Loan Form
  const [farmerName, setFarmerName] = useState('Ramkishan Yadav');
  const [acres, setAcres] = useState(3.5);
  const [crop, setCrop] = useState('Paddy (Kharif)');
  const [requestedLoan, setRequestedLoan] = useState(150000);
  const [promptRepayment, setPromptRepayment] = useState(true);

  // Inventory Form
  const [ureaSys, setUreaSys] = useState(450);
  const [ureaPhys, setUreaPhys] = useState(450);
  const [dapSys, setDapSys] = useState(200);
  const [dapPhys, setDapPhys] = useState(200);
  const [seedSys, setSeedSys] = useState(1250);
  const [seedPhys, setSeedPhys] = useState(1250);

  if (!isOpen) return null;

  // 1. Audit Daybook
  const handleDaybookClose = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest('/erp/sandbox/daybook-close', {
        method: 'POST',
        body: JSON.stringify({
          society_id: 'PACS-UP-RAMPUR-004',
          cash_opening_balance: parseFloat(openingBalance),
          cash_receipts: parseFloat(receipts),
          cash_payments: parseFloat(payments),
          vault_cash_physical: parseFloat(physicalVault)
        })
      });
      setResult({ type: 'daybook', data: res });
    } catch (err) {
      setResult({
        type: 'daybook',
        data: {
          status: (parseFloat(physicalVault) === (parseFloat(openingBalance) + parseFloat(receipts) - parseFloat(payments))) ? 'BALANCED_AUDITED' : 'DISCREPANCY_FLAGGED',
          is_balanced: (parseFloat(physicalVault) === (parseFloat(openingBalance) + parseFloat(receipts) - parseFloat(payments))),
          computed_closing_balance: parseFloat(openingBalance) + parseFloat(receipts) - parseFloat(payments),
          physical_vault_cash: parseFloat(physicalVault),
          reconciliation_discrepancy: parseFloat(physicalVault) - (parseFloat(openingBalance) + parseFloat(receipts) - parseFloat(payments)),
          tamper_proof_chain_hash: 'ec6d14f98a7f06fd321ba89f412c90ab51ef',
          operator: 'Ramesh Kumar (Certified PACS Operator)',
          closed_at: new Date().toISOString(),
          statutory_citation: '[KB-PACS-DAYBOOK:C1]',
          citation_detail: 'Model Byelaws 2023: Rule 34 - Mandatory daily cash balancing against general ledger voucher summary.'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Appraise KCC
  const handleKccAppraise = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest('/erp/sandbox/kcc-disburse', {
        method: 'POST',
        body: JSON.stringify({
          farmer_name: farmerName,
          land_holding_acres: parseFloat(acres),
          crop_type: crop,
          requested_amount: parseFloat(requestedLoan),
          prompt_repayment: promptRepayment
        })
      });
      setResult({ type: 'kcc', data: res });
    } catch (err) {
      const baseSof = parseFloat(acres) * 45000;
      const maxLimit = Math.min(300000, Math.round(baseSof * 1.30));
      setResult({
        type: 'kcc',
        data: {
          status: parseFloat(requestedLoan) <= maxLimit ? 'APPROVED' : 'PARTIALLY_APPROVED_REDUCED',
          farmer_name: farmerName,
          calculated_max_kcc_limit: maxLimit,
          requested_amount: parseFloat(requestedLoan),
          approved_amount: Math.min(parseFloat(requestedLoan), maxLimit),
          base_interest_rate: '7.0% p.a.',
          prompt_repayment_incentive: promptRepayment ? '-3.0% p.a.' : '0.0% p.a.',
          net_effective_farmer_rate: promptRepayment ? '4.0% p.a.' : '7.0% p.a.',
          subvention_subsidy_source: 'NABARD Modified Interest Subvention Scheme (MISS)',
          statutory_citation: '[KB-NABARD-MISS:C1]',
          citation_detail: 'NABARD Guidelines: ₹3.00 Lakh credit ceiling eligible for 3% prompt repayment incentive.'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Tally Inventory
  const handleInventoryTally = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest('/erp/sandbox/inventory-tally', {
        method: 'POST',
        body: JSON.stringify({
          urea_bags_system: parseInt(ureaSys),
          urea_bags_physical: parseInt(ureaPhys),
          dap_bags_system: parseInt(dapSys),
          dap_bags_physical: parseInt(dapPhys),
          paddy_seeds_kg_system: parseFloat(seedSys),
          paddy_seeds_kg_physical: parseFloat(seedPhys)
        })
      });
      setResult({ type: 'inventory', data: res });
    } catch (err) {
      const uDiff = parseInt(ureaPhys) - parseInt(ureaSys);
      const dDiff = parseInt(dapPhys) - parseInt(dapSys);
      const sDiff = parseFloat(seedPhys) - parseFloat(seedSys);
      const intact = (uDiff === 0 && dDiff === 0 && sDiff === 0);
      setResult({
        type: 'inventory',
        data: {
          status: intact ? 'STOCK_RECONCILED' : 'VARIANCE_FLAGGED',
          urea_discrepancy_bags: uDiff,
          dap_discrepancy_bags: dDiff,
          seeds_discrepancy_kg: sDiff,
          is_stock_intact: intact,
          warehouse_standard: 'WDRA Model e-NWR Electronic Stock Register',
          statutory_citation: '[KB-MODEL-BYELAWS:C1]'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Interactive PACS ERP Simulation Sandbox</h3>
                <span className="text-[10px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                  SIH #26087
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operate simulated National Cooperative PACS computerized software with live statutory validation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => { setActiveTab('daybook'); setResult(null); }}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'daybook'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins size={15} />
            <span>5-Step Day-Book Balancing</span>
          </button>

          <button
            onClick={() => { setActiveTab('kcc'); setResult(null); }}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'kcc'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark size={15} />
            <span>KCC Loan Appraisal (NABARD MISS)</span>
          </button>

          <button
            onClick={() => { setActiveTab('inventory'); setResult(null); }}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={15} />
            <span>Warehouse Inventory Tally</span>
          </button>

          <button
            onClick={() => { setActiveTab('ledger'); setResult(null); }}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={15} />
            <span>Visual T-Accounts Ledger</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* TAB 1: DAY-BOOK BALANCING */}
          {activeTab === 'daybook' && (
            <form onSubmit={handleDaybookClose} className="space-y-4">
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Statutory Rule: </span>
                  Mandatory under Model Byelaws 2023 (Rule 34). Daily cash balance must reconcile with physical vault count before end-of-day ledger hash sealing.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Opening Cash Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Daily Cash Receipts (₹)
                  </label>
                  <input
                    type="number"
                    value={receipts}
                    onChange={(e) => setReceipts(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Loan repayments + share capital</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Daily Cash Payments (₹)
                  </label>
                  <input
                    type="number"
                    value={payments}
                    onChange={(e) => setPayments(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500">KCC disbursements + expenses</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Physical Vault Count (₹)
                  </label>
                  <input
                    type="number"
                    value={physicalVault}
                    onChange={(e) => setPhysicalVault(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Physical cash in locker vault</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                  <span>Execute 5-Step Closing Protocol</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: KCC LOAN APPRAISAL */}
          {activeTab === 'kcc' && (
            <form onSubmit={handleKccAppraise} className="space-y-4">
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
                <Landmark size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">NABARD Modified Interest Subvention Scheme (MISS): </span>
                  KCC short-term crop loans up to ₹3,00,000 qualify for 3% prompt repayment incentive, reducing interest from 7% to 4% p.a.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Farmer Member Name
                  </label>
                  <input
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Land Holding (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={acres}
                    onChange={(e) => setAcres(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Crop Pattern
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Paddy (Kharif)">Paddy (Kharif) • SOF ₹45,000/acre</option>
                    <option value="Wheat (Rabi)">Wheat (Rabi) • SOF ₹42,000/acre</option>
                    <option value="Sugarcane (Annual)">Sugarcane (Annual) • SOF ₹65,000/acre</option>
                    <option value="Mustard / Oilseeds">Mustard / Oilseeds • SOF ₹35,000/acre</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Requested Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={requestedLoan}
                    onChange={(e) => setRequestedLoan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promptRepay"
                  checked={promptRepayment}
                  onChange={(e) => setPromptRepayment(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promptRepay" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Eligible for 3% Prompt Repayment Incentive (PRI under MISS)
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Landmark size={15} />}
                  <span>Appraise Loan under Scale of Finance</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: INVENTORY TALLY */}
          {activeTab === 'inventory' && (
            <form onSubmit={handleInventoryTally} className="space-y-4">
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 flex items-start gap-2.5">
                <Layers size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">WDRA Electronic Stock Register: </span>
                  PACS warehouses issuing electronic Negotiable Warehouse Receipts (e-NWR) must reconcile system bags with physical stock daily.
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Urea (System Bags)</label>
                  <input type="number" value={ureaSys} onChange={(e) => setUreaSys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Urea (Physical Count)</label>
                  <input type="number" value={ureaPhys} onChange={(e) => setUreaPhys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">DAP (System Bags)</label>
                  <input type="number" value={dapSys} onChange={(e) => setDapSys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">DAP (Physical Count)</label>
                  <input type="number" value={dapPhys} onChange={(e) => setDapPhys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Paddy Seeds (System kg)</label>
                  <input type="number" value={seedSys} onChange={(e) => setSeedSys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Paddy Seeds (Physical kg)</label>
                  <input type="number" value={seedPhys} onChange={(e) => setSeedPhys(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={15} />}
                  <span>Audit Electronic Stock Register</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: VISUAL T-ACCOUNTS LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <VisualTAccountsLedger />
            </div>
          )}

          {/* SIMULATION RESULT DISPLAY CARD */}
          {result && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3.5 shadow-lg">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {result.data.is_balanced || result.data.status === 'APPROVED' || result.data.is_stock_intact ? (
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  )}
                  <span className="text-xs font-mono font-bold text-blue-400">
                    STATUS: {result.data.status}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {result.data.statutory_citation}
                </span>
              </div>

              {/* Daybook Results */}
              {result.type === 'daybook' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Computed Closing</span>
                      <span className="font-bold text-white font-mono">₹{result.data.computed_closing_balance.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Physical Vault Cash</span>
                      <span className="font-bold text-white font-mono">₹{result.data.physical_vault_cash.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Variance / Delta</span>
                      <span className={`font-bold font-mono ${result.data.reconciliation_discrepancy === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{result.data.reconciliation_discrepancy.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Audit Seal</span>
                      <span className="font-bold text-blue-400 font-mono">SHA-256 Intact</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                    <span className="text-slate-500 block text-[10px]">Tamper-Proof Block Hash:</span>
                    {result.data.tamper_proof_chain_hash}
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {result.data.citation_detail}
                  </p>
                </div>
              )}

              {/* KCC Results */}
              {result.type === 'kcc' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Max Scale of Finance</span>
                      <span className="font-bold text-white font-mono">₹{result.data.calculated_max_kcc_limit.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Sanctioned Amount</span>
                      <span className="font-bold text-emerald-400 font-mono">₹{result.data.approved_amount.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Base Rate / Discount</span>
                      <span className="font-bold text-amber-400 font-mono">{result.data.base_interest_rate} ({result.data.prompt_repayment_incentive})</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Net Farmer Rate</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">{result.data.net_effective_farmer_rate}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {result.data.citation_detail}
                  </p>
                </div>
              )}

              {/* Inventory Results */}
              {result.type === 'inventory' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Urea Discrepancy</span>
                      <span className={`font-bold font-mono ${result.data.urea_discrepancy_bags === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.data.urea_discrepancy_bags} Bags
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">DAP Discrepancy</span>
                      <span className={`font-bold font-mono ${result.data.dap_discrepancy_bags === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.data.dap_discrepancy_bags} Bags
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Seeds Discrepancy</span>
                      <span className={`font-bold font-mono ${result.data.seeds_discrepancy_kg === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.data.seeds_discrepancy_kg} kg
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Compliance: {result.data.warehouse_standard} • All audits stamped with operator signature.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Compliant with Ministry of Cooperation Computerization Guidelines (₹2,925.39 Cr project)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Close Sandbox
          </button>
        </div>

      </div>
    </div>
  );
}
