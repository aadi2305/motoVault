/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  MotoVaultState, 
  MiscExpense, 
  MiscExpenseCategory, 
  FuelLog, 
  MaintenanceEvent, 
  DocumentRecord, 
  ModificationItem 
} from '../types';
import { calculateFinancials } from '../utils/calculator';
import { 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  Tag, 
  Trash2, 
  Edit3, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Download, 
  Fuel, 
  Wrench, 
  FolderLock, 
  Cog, 
  Coins, 
  X,
  Gauge
} from 'lucide-react';

interface LedgerTransaction {
  id: string;
  originType: 'fuel' | 'maintenance' | 'modification' | 'document' | 'misc';
  date: string;
  categoryName: 'Fuel' | 'Maintenance' | 'Modifications' | 'Documents' | 'Miscellaneous';
  description: string;
  amount: number;
  rawObject: any;
}

interface FinanceTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
}

export default function FinanceTab({ state, onUpdateState }: FinanceTabProps) {
  // Navigation & Screen forms state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<{
    id: string;
    originType: 'fuel' | 'maintenance' | 'modification' | 'document' | 'misc';
    date: string;
    cost: number;
    description: string;
    miscCategory?: MiscExpenseCategory;
  } | null>(null);

  // Quick Add Misc form states
  const [miscDate, setMiscDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [miscOdo, setMiscOdo] = useState<number | ''>(state.currentOdo || '');
  const [miscItem, setMiscItem] = useState<string>('');
  const [miscCategory, setMiscCategory] = useState<MiscExpenseCategory>(MiscExpenseCategory.GEAR);
  const [miscCost, setMiscCost] = useState<number | ''>('');
  const [miscNotes, setMiscNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Financial status engine computations
  const financials = useMemo(() => {
    return calculateFinancials(
      state.currentOdo,
      state.fuelLogs,
      state.maintenanceEvents,
      state.garageMods,
      state.documents,
      state.miscExpenses || []
    );
  }, [state]);

  // Unified Transaction ledger aggregator
  const ledgerTransactions = useMemo(() => {
    const list: LedgerTransaction[] = [];

    // 1. Fuel costs
    state.fuelLogs.forEach(log => {
      if (log.totalCost > 0) {
        list.push({
          id: log.id,
          originType: 'fuel',
          date: log.date,
          categoryName: 'Fuel',
          description: log.fuelStation ? `Refuel at ${log.fuelStation} (${log.fuelLiters}L)` : `Refueled ${log.fuelLiters}L`,
          amount: log.totalCost,
          rawObject: log
        });
      }
    });

    // 2. Maintenance costs
    state.maintenanceEvents.forEach(evt => {
      if (evt.totalCost && evt.totalCost > 0) {
        list.push({
          id: evt.id,
          originType: 'maintenance',
          date: evt.date,
          categoryName: 'Maintenance',
          description: `Service at ${evt.serviceCenter} - Tasks: ${evt.tasksPerformed.join(', ')}`,
          amount: evt.totalCost,
          rawObject: evt
        });
      }
    });

    // 3. Modifications
    state.garageMods.forEach(mod => {
      if (mod.status === 'Installed' && mod.price > 0) {
        list.push({
          id: mod.id,
          originType: 'modification',
          date: mod.installationOdo ? `Odo: ${mod.installationOdo}` : 'Installed Mod', // Mod usually doesn\'t have explicit date, mock or default
          categoryName: 'Modifications',
          description: `Installed ${mod.name} (${mod.source || 'Garage'})`,
          amount: mod.price,
          rawObject: mod
        });
      }
    });

    // 4. Documents
    state.documents.forEach(doc => {
      if (doc.cost && doc.cost > 0) {
        list.push({
          id: doc.id,
          originType: 'document',
          date: doc.expiryDate ? `Expires: ${doc.expiryDate}` : 'Credential registration',
          categoryName: 'Documents',
          description: `${doc.category} Certificate - Reference ${doc.docNumber}`,
          amount: doc.cost,
          rawObject: doc
        });
      }
    });

    // 5. Miscellaneous
    if (state.miscExpenses) {
      state.miscExpenses.forEach(exp => {
        if (exp.cost > 0) {
          list.push({
            id: exp.id,
            originType: 'misc',
            date: exp.date,
            categoryName: 'Miscellaneous',
            description: `${exp.category.toUpperCase()} - ${exp.itemReason} ${exp.notes ? `(${exp.notes})` : ''}`,
            amount: exp.cost,
            rawObject: exp
          });
        }
      });
    }

    // Sort descending by date (for fields with dates) otherwise secondary order
    return list.sort((a, b) => {
      const isADate = a.date.includes('-');
      const isBDate = b.date.includes('-');
      if (isADate && isBDate) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return isADate ? -1 : isBDate ? 1 : b.amount - a.amount;
    });
  }, [state]);

  // Filtering list
  const filteredLedger = useMemo(() => {
    if (filterCategory === 'all') return ledgerTransactions;
    return ledgerTransactions.filter(item => item.categoryName.toLowerCase() === filterCategory.toLowerCase());
  }, [ledgerTransactions, filterCategory]);

  // Setup Visual Donut / Pie percentage measurements
  const chartPieSegments = useMemo(() => {
    const total = financials.totalExpense;
    if (total <= 0) return [];

    const rawSegments = [
      { name: 'Fuel', amount: financials.fuelCost, color: '#FF5C00', icon: Fuel },
      { name: 'Maintenance', amount: financials.serviceCost, color: '#3B82F6', icon: Wrench },
      { name: 'Modifications', amount: financials.installedModsCost, color: '#8B5CF6', icon: Cog },
      { name: 'Credentials', amount: financials.docFees, color: '#10B981', icon: FolderLock },
      { name: 'Misc', amount: financials.miscCost, color: '#EC4899', icon: Coins }
    ];

    let startAngle = 0;
    return rawSegments.map(seg => {
      const percentage = (seg.amount / total) * 100;
      const angle = (seg.amount / total) * 360;
      const currentSegment = {
        ...seg,
        percentage,
        angle,
        startAngle
      };
      startAngle += angle;
      return currentSegment;
    }).filter(s => s.amount > 0);
  }, [financials]);

  // Submit global miscellaneous expenses
  const handleQuickAddMisc = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const enteredCost = Number(miscCost);
    if (!miscItem.trim()) {
      setErrorMsg('Please specify the expense item or reason.');
      return;
    }
    if (isNaN(enteredCost) || enteredCost <= 0) {
      setErrorMsg('Please enter a valid expense cost.');
      return;
    }

    const newExpense: MiscExpense = {
      id: `misc-${Date.now()}`,
      date: miscDate,
      category: miscCategory,
      itemReason: miscItem.trim(),
      cost: enteredCost,
      notes: miscNotes.trim() || undefined,
      odo: miscOdo !== '' ? Number(miscOdo) : undefined
    };

    const updatedMisc = [newExpense, ...(state.miscExpenses || [])];
    onUpdateState({
      miscExpenses: updatedMisc,
      currentOdo: miscOdo !== '' ? Math.max(state.currentOdo, Number(miscOdo)) : state.currentOdo
    });

    // Reset fields
    setMiscItem('');
    setMiscNotes('');
    setMiscCost('');
    setMiscOdo(state.currentOdo);
    setShowQuickAdd(false);
  };

  // Delete transaction directly from the ledger
  const handleDeleteTransaction = (tx: LedgerTransaction) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${tx.categoryName} expense?`);
    if (!confirmDelete) return;

    if (tx.originType === 'fuel') {
      const updated = state.fuelLogs.filter(l => l.id !== tx.id);
      onUpdateState({ fuelLogs: updated });
    } 
    else if (tx.originType === 'maintenance') {
      const updated = state.maintenanceEvents.filter(l => l.id !== tx.id);
      onUpdateState({ maintenanceEvents: updated });
    } 
    else if (tx.originType === 'document') {
      // Set Document cost to 0 (effectively removing its transaction log trace)
      const updated = state.documents.map(d => d.id === tx.id ? { ...d, cost: undefined } : d);
      onUpdateState({ documents: updated });
    } 
    else if (tx.originType === 'modification') {
      // Revert installed status of mod back to Wishlist so it doesn't aggregate as installed
      const updated = state.garageMods.map(m => m.id === tx.id ? { ...m, status: 'Wishlist' as any, installationOdo: undefined } : m);
      onUpdateState({ garageMods: updated });
    } 
    else if (tx.originType === 'misc') {
      const updated = (state.miscExpenses || []).filter(l => l.id !== tx.id);
      onUpdateState({ miscExpenses: updated });
    }
  };

  // Submit edit transactions
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const targetCost = Number(editingTx.cost);
    if (!editingTx.description.trim()) {
      alert('Description must not be empty.');
      return;
    }
    if (isNaN(targetCost) || targetCost < 0) {
      alert('Cost must be zero or a positive number.');
      return;
    }

    if (editingTx.originType === 'fuel') {
      const updated = state.fuelLogs.map(l => {
        if (l.id === editingTx.id) {
          return { ...l, totalCost: targetCost, date: editingTx.date };
        }
        return l;
      });
      onUpdateState({ fuelLogs: updated });
    } 
    else if (editingTx.originType === 'maintenance') {
      const updated = state.maintenanceEvents.map(l => {
        if (l.id === editingTx.id) {
          return { ...l, totalCost: targetCost, date: editingTx.date };
        }
        return l;
      });
      onUpdateState({ maintenanceEvents: updated });
    } 
    else if (editingTx.originType === 'document') {
      const updated = state.documents.map(d => {
        if (d.id === editingTx.id) {
          return { ...d, cost: targetCost };
        }
        return d;
      });
      onUpdateState({ documents: updated });
    } 
    else if (editingTx.originType === 'modification') {
      const updated = state.garageMods.map(m => {
        if (m.id === editingTx.id) {
          return { ...m, price: targetCost };
        }
        return m;
      });
      onUpdateState({ garageMods: updated });
    } 
    else if (editingTx.originType === 'misc') {
      const updated = (state.miscExpenses || []).map(exp => {
        if (exp.id === editingTx.id) {
          return { 
            ...exp, 
            cost: targetCost, 
            date: editingTx.date, 
            itemReason: editingTx.description,
            category: editingTx.miscCategory || exp.category
          };
        }
        return exp;
      });
      onUpdateState({ miscExpenses: updated });
    }

    setEditingTx(null);
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Fuel':
        return <Fuel className="h-3.5 w-3.5 text-[#FF5C00]" />;
      case 'Maintenance':
        return <Wrench className="h-3.5 w-3.5 text-blue-400" />;
      case 'Modifications':
        return <Cog className="h-3.5 w-3.5 text-purple-400" />;
      case 'Documents':
        return <FolderLock className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Coins className="h-3.5 w-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with financial summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Expenditure Ledger & Analytics</h2>
          <p className="font-mono text-[11px] text-[#888D96]">Centralized financial tracker aggregating running costs across all modules</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setMiscOdo(state.currentOdo);
            setShowQuickAdd(!showQuickAdd);
          }}
          className="flex items-center justify-center space-x-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-lg transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Quick Log Expense</span>
        </button>
      </div>

      {/* Quick Add Dialog Panel */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAddMisc} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
            <h3 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00]">
              Log Miscellaneous Expense
            </h3>
            <button type="button" onClick={() => setShowQuickAdd(false)} className="text-[#888D96] hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="flex gap-2 p-3 bg-red-950/20 border border-red-500/25 rounded-lg text-red-200 font-mono text-[11px]">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Date</label>
              <input
                type="date"
                required
                value={miscDate}
                onChange={(e) => setMiscDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Odometer (Optional)</label>
              <input
                type="number"
                value={miscOdo}
                onChange={(e) => setMiscOdo(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="Logged Odometer"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Category</label>
              <select
                value={miscCategory}
                onChange={(e) => setMiscCategory(e.target.value as MiscExpenseCategory)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
              >
                <option value={MiscExpenseCategory.GEAR}>Riding Gear & Protection</option>
                <option value={MiscExpenseCategory.WASHING_DETAILING}>Washing & Detailing</option>
                <option value={MiscExpenseCategory.PARKING_FINES}>Parking Fees / Traffic Fines</option>
                <option value={MiscExpenseCategory.TOLLS}>Highway Toll Charges</option>
                <option value={MiscExpenseCategory.OTHERS}>Others / Miscellaneous</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Expense Reason / Item Name</label>
              <input
                type="text"
                required
                placeholder="E.g., Leather Cleaners, Highway Toll NH4, Parking"
                value={miscItem}
                onChange={(e) => setMiscItem(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Cost (₹)*</label>
              <input
                type="number"
                required
                placeholder="Expenditure Amount"
                value={miscCost}
                onChange={(e) => setMiscCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Notes / Details</label>
              <textarea
                placeholder="Additional notes about purchase, seller, locations, receipts, etc."
                value={miscNotes}
                onChange={(e) => setMiscNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#2A2D35] gap-2">
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="rounded-lg border border-[#2A2D35] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#888D96] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FF5C00] px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-md transition"
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* 2. KPIs Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Spend KPI */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-1">Total Lifetime Spend</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">
                ₹ {financials.totalExpense.toLocaleString()}
              </span>
            </div>
            <p className="font-mono text-[9px] text-[#888D96] mt-1.5">Across fuel, modifications, operations & misc</p>
          </div>
          <Coins className="h-8 w-8 text-[#FF5C00]/25 stroke-1" />
        </div>

        {/* Cost per km KPI */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-1">Lifetime Cost per KM</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[#00C853]">
                ₹ {financials.costPerKm.toFixed(2)}
              </span>
              <span className="text-xs text-[#888D96]">/km</span>
            </div>
            <p className="font-mono text-[9px] text-[#888D96] mt-1.5">Elapsed distance: {financials.distanceTravelled.toLocaleString()} km</p>
          </div>
          <TrendingUp className="h-8 w-8 text-emerald-500/20 stroke-1" />
        </div>

        {/* Odometer Tracker */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-1">Odometer Span</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-[#888D96] font-mono">{financials.earliestOdo}</span>
              <span className="text-[#888D96] font-mono">&rarr;</span>
              <span className="text-3xl font-extrabold text-white font-mono">
                {financials.latestOdo.toLocaleString()}
              </span>
              <span className="text-xs text-[#888D96]">km</span>
            </div>
            <p className="font-mono text-[9px] text-[#888D96] mt-1.5">Timeline span established across logs</p>
          </div>
          <Gauge className="h-8 w-8 text-blue-500/20 stroke-1" />
        </div>
      </div>

      {/* 3. Breakdown Donut Chart */}
      {financials.totalExpense > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Donut graphic */}
          <div className="lg:col-span-5 rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 flex flex-col items-center justify-center space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-[#888D96] text-center w-full">Expense Distribution Proportion</h4>
            
            {/* SVG circle segments */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="38" stroke="#101114" strokeWidth="12" fill="none" />
                {chartPieSegments.map((seg, i) => {
                  const r = 38;
                  const circ = 2 * Math.PI * r;
                  const strokeDasharray = `${(seg.percentage / 100) * circ} ${circ}`;
                  const strokeDashoffset = -((seg.startAngle / 360) * circ);
                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r={r}
                      stroke={seg.color}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    >
                      <title>{seg.name}: ₹{seg.amount.toLocaleString()} ({seg.percentage.toFixed(1)}%)</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Central text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Aggregated</span>
                <span className="text-md font-bold text-white mt-0.5">₹ {financials.totalExpense.toLocaleString()}</span>
              </div>
            </div>

            {/* Segment legend */}
            <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
              {chartPieSegments.map((seg, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                  <span className="text-[#888D96] truncate">{seg.name}</span>
                  <span className="text-white ml-auto font-bold">{seg.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details breakdown */}
          <div className="lg:col-span-7 rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-[#888D96]">Aggregate Ledger Category Insights</h4>
            <div className="space-y-3 pt-1">
              {[
                { name: 'Fuel Expenditures', amount: financials.fuelCost, max: financials.totalExpense, color: 'bg-[#FF5C00]', icon: Fuel },
                { name: 'Service, Parts & Lubricants', amount: financials.serviceCost, max: financials.totalExpense, color: 'bg-blue-400', icon: Wrench },
                { name: 'Installed Modifications', amount: financials.installedModsCost, max: financials.totalExpense, color: 'bg-purple-400', icon: Cog },
                { name: 'Glovebox Credentials & Document Fees', amount: financials.docFees, max: financials.totalExpense, color: 'bg-emerald-400', icon: FolderLock },
                { name: 'Miscellaneous Expenses (Gear, Washing, Tolls)', amount: financials.miscCost, max: financials.totalExpense, color: 'bg-pink-400', icon: Coins }
              ].map((cat, i) => {
                const pct = cat.max > 0 ? (cat.amount / cat.max) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <cat.icon className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-white font-medium">{cat.name}</span>
                      </div>
                      <div className="text-zinc-400 font-mono text-[11px]">
                        ₹ {cat.amount.toLocaleString()}{' '}
                        <span className="text-[10px] text-zinc-600">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#0A0B0D] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#2A2D35] bg-[#16181D]/40 p-8 text-center">
          <p className="font-mono text-xs text-[#888D96]">No expense records logged to build proportion trends yet.</p>
        </div>
      )}

      {/* 4. Unified Expense Ledger Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35] pb-2">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#E0E0E0] font-bold">
            Master Expenditures Registry
          </h3>

          {/* Filtering buttons */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-zinc-500 font-mono mr-1 flex items-center gap-0.5"><Filter className="h-3 w-3" /> Filter:</span>
            {['all', 'Fuel', 'Maintenance', 'Modifications', 'Documents', 'Miscellaneous'].map((cat, i) => {
              const isActive = filterCategory === cat.toLowerCase();
              return (
                <button
                  key={i}
                  onClick={() => setFilterCategory(cat.toLowerCase())}
                  className={`px-2.5 py-1 rounded text-[9.5px] font-mono tracking-wide uppercase transition border ${
                    isActive 
                      ? 'bg-white text-black border-white' 
                      : 'bg-zinc-950/40 text-zinc-400 border-[#2A2D35] hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {cat === 'all' ? 'show all' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editing Modal Dialog Popup */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <form onSubmit={handleSaveEdit} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <h4 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00]">
                Edit Transaction - {editingTx.categoryName}
              </h4>
              
              <div className="space-y-3 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[#888D96]">Transaction Date</label>
                  <input
                    type="text"
                    required
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                  />
                  <span className="text-[9px] text-[#60636b]">Format: YYYY-MM-DD or standard detail text</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[#888D96]">Description</label>
                  <input
                    type="text"
                    required
                    value={editingTx.description}
                    onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#888D96]">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingTx.cost}
                    onChange={(e) => setEditingTx({ ...editingTx, cost: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>

                {editingTx.originType === 'misc' && (
                  <div className="space-y-1">
                    <label className="text-[#888D96]">Category</label>
                    <select
                      value={editingTx.miscCategory}
                      onChange={(e) => setEditingTx({ ...editingTx, miscCategory: e.target.value as MiscExpenseCategory })}
                      className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
                    >
                      <option value={MiscExpenseCategory.GEAR}>Riding Gear & Protection</option>
                      <option value={MiscExpenseCategory.WASHING_DETAILING}>Washing & Detailing</option>
                      <option value={MiscExpenseCategory.PARKING_FINES}>Parking Fees / Traffic Fines</option>
                      <option value={MiscExpenseCategory.TOLLS}>Highway Toll Charges</option>
                      <option value={MiscExpenseCategory.OTHERS}>Others</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-[#2A2D35] gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="rounded-lg border border-[#2A2D35] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#888D96] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-white text-black px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-200 cursor-pointer shadow-md transition"
                >
                  Apply Change
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ledger table */}
        {filteredLedger.length === 0 ? (
          <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-8 text-center">
            <p className="font-mono text-xs text-[#888D96]">No historical ledger transactions matched this category filter.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-zinc-300">
                <thead>
                  <tr className="bg-zinc-950/60 text-[10px] uppercase tracking-widest text-[#888D96] border-b border-[#2A2D35]">
                    <th className="p-3.5 pr-2 w-28">Date / Mark</th>
                    <th className="p-3.5 px-2 w-10 text-center">Class</th>
                    <th className="p-3.5 px-3">Description</th>
                    <th className="p-3.5 px-2 w-28 text-right">Cost Amount</th>
                    <th className="p-3.5 pr-4 w-12 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D35] text-[11px]">
                  {filteredLedger.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/20 transition-all">
                      <td className="p-3.5 pr-2 whitespace-nowrap text-zinc-500 font-semibold">{tx.date}</td>
                      <td className="p-3.5 px-2">
                        <span className="flex items-center justify-center p-1.5 rounded-lg bg-[#0A0B0D] border border-zinc-800/10" title={tx.categoryName}>
                          {getCategoryIcon(tx.categoryName)}
                        </span>
                      </td>
                      <td className="p-3.5 px-3 text-white truncate max-w-xs sm:max-w-md font-sans font-medium" title={tx.description}>
                        {tx.description}
                        <div className="text-[10px] text-[#888D96] font-mono mt-0.5">{tx.categoryName} Transaction</div>
                      </td>
                      <td className="p-3.5 px-2 text-right font-bold text-[#E0E0E0] whitespace-nowrap text-xs">
                        ₹ {tx.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingTx({
                              id: tx.id,
                              originType: tx.originType,
                              date: tx.date,
                              cost: tx.amount,
                              description: tx.originType === 'misc' ? (tx.rawObject as MiscExpense).itemReason : tx.description,
                              miscCategory: tx.originType === 'misc' ? (tx.rawObject as MiscExpense).category : undefined
                            })}
                            className="p-1.5 rounded bg-zinc-950/30 text-[#888D96] border border-transparent hover:text-white hover:border-zinc-800 transition"
                            title="Edit amount/details"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx as any)}
                            className="p-1.5 rounded bg-zinc-950/30 text-[#888D96] border border-transparent hover:text-red-400 hover:border-red-950/60 transition"
                            title="Delete transaction entry"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
