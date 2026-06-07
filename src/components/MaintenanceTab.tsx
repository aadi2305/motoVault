/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MotoVaultState, MaintenanceEvent } from '../types';
import { calculateMaintenance } from '../utils/calculator';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Gauge, 
  IndianRupee, 
  Wrench, 
  Upload, 
  Eye, 
  X, 
  FileText,
  BookmarkCheck,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface MaintenanceTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
}

const ALL_TASKS = [
  'Engine Oil Change',
  'Oil Filter Change',
  'Chain Clean & Lube',
  'Chain Slack Adjusted',
  'Air Filter Clean',
  'Air Filter Replaced',
  'Spark Plug Replaced',
  'Brake Pads Replaced',
  'Brake Fluid Flushed',
  'General Wash & Lube'
];

interface QuickTemplate {
  name: string;
  tasks: string[];
  description: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    name: 'Official OEM Service (Honda)',
    tasks: ['Engine Oil Change', 'Oil Filter Change', 'Chain Clean & Lube', 'Air Filter Clean'],
    description: 'Standard Periodic Honda Service Checklist'
  },
  {
    name: 'Quick Chain Care',
    tasks: ['Chain Clean & Lube', 'Chain Slack Adjusted'],
    description: 'Fast drive-chain cleaning & sag adjustment'
  },
  {
    name: 'Full Fluid Flush',
    tasks: ['Engine Oil Change', 'Oil Filter Change', 'Brake Fluid Flushed'],
    description: 'Fluids maintenance and brake refresh'
  }
];

export default function MaintenanceTab({ state, onUpdateState }: MaintenanceTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odo, setOdo] = useState<number | ''>(state.currentOdo || '');
  const [serviceCenter, setServiceCenter] = useState('Honda ASC');
  const [customServiceCenter, setCustomServiceCenter] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [cost, setCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  // Active preview image popup or modal
  const [activeBillUrl, setActiveBillUrl] = useState<string | null>(null);

  // Expanded log item for inline details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Calculate maintenance profiles
  const maintStatus = calculateMaintenance(state.currentOdo, state.maintenanceEvents);

  // Sort logs descending by ODO and date
  const displayLogs = [...state.maintenanceEvents].sort(
    (a, b) => b.odo - a.odo || new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setErrorMsg("Receipt image is too large! Please choose an image under 2MB for storage limit safety.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateClick = (templateTasks: string[]) => {
    setSelectedTasks(templateTasks);
  };

  const toggleTaskSelection = (taskName: string) => {
    if (selectedTasks.includes(taskName)) {
      setSelectedTasks(selectedTasks.filter(t => t !== taskName));
    } else {
      setSelectedTasks([...selectedTasks, taskName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const enteredOdo = Number(odo);
    if (isNaN(enteredOdo) || enteredOdo <= 0) {
      setErrorMsg("Odometer reading must be a positive number.");
      return;
    }

    if (selectedTasks.length === 0) {
      setErrorMsg("Please check/select at least one task performed in this service event.");
      return;
    }

    const finalServiceCenter = serviceCenter === 'Other' 
      ? (customServiceCenter.trim() || 'Other Mechanic') 
      : serviceCenter;

    const newEvent: MaintenanceEvent = {
      id: `m-${Date.now()}`,
      date,
      odo: enteredOdo,
      serviceCenter: finalServiceCenter,
      totalCost: cost !== '' ? Number(cost) : 0,
      billPhotoUrl: photoDataUrl || undefined,
      notes: notes.trim(),
      tasksPerformed: selectedTasks
    };

    const updatedEvents = [...state.maintenanceEvents, newEvent];

    onUpdateState({
      maintenanceEvents: updatedEvents,
      currentOdo: Math.max(state.currentOdo, enteredOdo)
    });

    // Reset Form fields
    setOdo(state.currentOdo);
    setServiceCenter('Honda ASC');
    setCustomServiceCenter('');
    setSelectedTasks([]);
    setCost('');
    setNotes('');
    setPhotoDataUrl('');
    setFileName('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this service event? This will recompute your financial ledger and vehicle alerts.")) {
      const updated = state.maintenanceEvents.filter(evt => evt.id !== id);
      onUpdateState({
        maintenanceEvents: updated
      });
    }
  };

  // Helper colors for statuses
  const getStatusStyle = (status: 'OK' | 'WARNING' | 'DUE') => {
    if (status === 'DUE') return { text: 'text-red-400', border: 'border-red-500/25', bg: 'bg-red-500/10', fill: 'bg-red-500' };
    if (status === 'WARNING') return { text: 'text-[#FF5C00]', border: 'border-[#FF5C00]/25', bg: 'bg-[#FF5C00]/10', fill: 'bg-[#FF5C00]' };
    return { text: 'text-[#00C853]', border: 'border-[#2A2D35]', bg: 'bg-[#00C853]/10', fill: 'bg-[#00C853]' };
  };

  // Build the 4 consumables models
  const consumables = [
    {
      title: 'Chain Lubrication',
      interval: 'Every 500 km',
      dueKm: maintStatus.chainLubeDueKm,
      status: maintStatus.chainLubeStatus,
      lastText: maintStatus.lastLubeOdo ? `Last logged at ${maintStatus.lastLubeOdo} km` : 'No lube logs',
      unitMax: 500,
      description: 'Protects sprocket teeth & stops driven metal drive friction.',
    },
    {
      title: 'Chain Slack Sagar',
      interval: 'Every 1500 km',
      dueKm: maintStatus.chainSlackDueKm,
      status: maintStatus.chainSlackStatus,
      lastText: maintStatus.lastSlackOdo ? `Last logged at ${maintStatus.lastSlackOdo} km` : 'No adjustments noted',
      unitMax: 1500,
      description: 'Keeps chain play within 25-30mm sag limits.',
    },
    {
      title: 'Engine Oil Replacement',
      interval: '5000 km / 6 months',
      dueKm: maintStatus.engineOilDueKm,
      dueDays: maintStatus.engineOilDueDays,
      status: maintStatus.engineOilStatus,
      lastText: maintStatus.lastOilOdo 
        ? `Last at ${maintStatus.lastOilOdo} km (${maintStatus.lastOilDate})` 
        : 'Oil change not found',
      unitMax: 5000,
      description: 'Cools components & lubricates tight pistons.',
    },
    {
      title: 'Air Filter Cleaning/Care',
      interval: 'Every 3000 km',
      dueKm: maintStatus.airFilterDueKm,
      status: maintStatus.airFilterStatus,
      lastText: maintStatus.lastAirFilterOdo ? `Last logged at ${maintStatus.lastAirFilterOdo} km` : 'No air filter logs',
      unitMax: 3000,
      description: 'Keeps cylinders dust-free for maximum fuel efficiency.',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header section with metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-[#FF5C00]" />
            <span>Service & Maintenance Center</span>
          </h2>
          <p className="font-mono text-[11px] text-[#888D96]">Structured service event journal tracking metrics in high precision</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setOdo(state.currentOdo);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center space-x-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-lg transition duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showAddForm ? 'Close panel' : 'Log Service Event'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex gap-2.5 rounded-xl border border-red-500/25 bg-red-950/25 p-4 text-xs font-mono text-red-200">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <div>
            <p className="font-bold">Entry Blocked</p>
            <p className="text-red-400/90 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Add New Service Event Panel Form */}
      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-xl space-y-5"
        >
          <div className="border-b border-[#2A2D35] pb-3 flex items-center justify-between">
            <h3 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00] flex items-center space-x-1.5">
              <BookmarkCheck className="h-4 w-4" />
              <span>Record Service Logbook Entry</span>
            </h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-[#888D96] hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick-Fill Templates Section */}
          <div className="space-y-2 bg-[#0A0B0D] p-3 rounded-lg border border-[#2A2D35]/50">
            <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
              <Building2 className="h-3 w-3 text-[#FF5C00]" />
              <span>Pre-set Templates (Apply prechecks instantly)</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTemplateClick(tpl.tasks)}
                  className="rounded-full bg-zinc-800/60 hover:bg-[#FF5C00]/20 hover:border-[#FF5C00]/30 border border-transparent px-3 py-1 font-mono text-[9px] text-[#E0E0E0] transition hover:text-[#FF5C00] text-left cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                >
                  <span className="font-bold">{tpl.name}</span>
                  <span className="text-[8px] text-[#888D96] sm:border-l sm:border-zinc-700 sm:pl-2">{tpl.description}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Date of Service</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Odometer (km)*</label>
                <input
                  type="number"
                  required
                  inputMode="numeric"
                  value={odo}
                  onChange={(e) => setOdo(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder={`Currently at ${state.currentOdo} km`}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Service Provider</label>
                <select
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
                >
                  <option value="Honda ASC">Honda Authorized ASC</option>
                  <option value="Local Mechanic">Local Garage Mechanic</option>
                  <option value="Self">Self (DIY)</option>
                  <option value="Other">Other (Custom Brand Name)</option>
                </select>
              </div>

              {serviceCenter === 'Other' && (
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Custom Garage Name</label>
                  <input
                    type="text"
                    required
                    value={customServiceCenter}
                    onChange={(e) => setCustomServiceCenter(e.target.value)}
                    placeholder="e.g. Redline Racing Syndicate"
                    className="w-full rounded-lg border border-[#FF5C00]/30 bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Total Invoice Cost (₹)*</label>
                <input
                  type="number"
                  required
                  inputMode="numeric"
                  value={cost}
                  onChange={(e) => setCost(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="₹ Total parts & labor fees"
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                />
              </div>

              {/* File Uploader for invoice photo */}
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Bill/Invoice Photo Upload</label>
                <div className="flex gap-2.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#888D96] hover:text-[#E0E0E0] hover:border-[#FF5C00]/40 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{fileName || "Choose JPEG/PNG..."}</span>
                    <Upload className="h-3.5 w-3.5 shrink-0 ml-1" />
                  </button>
                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDataUrl('');
                        setFileName('');
                      }}
                      className="p-2 border border-red-900/30 bg-red-950/20 text-red-400 rounded-lg shrink-0 hover:bg-red-500/10 cursor-pointer transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checkbox tasks collection */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#FF5C00] block border-b border-[#2A2D35] pb-1 font-bold">
                Tasks or Preventive Actions Performed*
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                {ALL_TASKS.map((taskName) => {
                  const isChecked = selectedTasks.includes(taskName);
                  return (
                    <label 
                      key={taskName}
                      className={`flex items-center space-x-2.5 p-2 rounded-lg border font-mono text-[10px] select-none transition cursor-pointer ${
                        isChecked 
                          ? 'border-[#FF5C00]/30 bg-[#FF5C00]/5 text-[#E0E0E0] font-semibold' 
                          : 'border-zinc-800 bg-[#0A0B0D] text-[#888D96] hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskSelection(taskName)}
                        className="rounded border-[#2A2D35] text-[#FF5C00] focus:ring-[#FF5C00]/40 h-3.5 w-3.5 accent-[#FF5C00] cursor-pointer"
                      />
                      <span className="truncate">{taskName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Service Memo / Mechanical Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specifications like lube spray type, general mechanics, alignment report details etc."
                rows={3}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2A2D35] gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-[#2A2D35] px-4 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-[#888D96] hover:text-zinc-200 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF5C00] px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-md transition"
              >
                Log Service Log
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Consumables Metrics & Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {consumables.map((c, i) => {
          const style = getStatusStyle(c.status);
          
          let pct = (c.dueKm / c.unitMax) * 100;
          if (c.dueDays !== undefined) {
            const timePct = (c.dueDays / 180) * 100;
            pct = Math.min(pct, timePct);
          }
          pct = Math.max(0, Math.min(100, pct));

          return (
            <div key={i} className={`rounded-xl border bg-[#16181D] p-5 shadow-sm space-y-3 relative overflow-hidden ${style.border}`}>
              <div className="absolute right-3 top-3">
                {c.status === 'DUE' ? (
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                ) : c.status === 'WARNING' ? (
                  <AlertTriangle className="h-5 w-5 text-[#FF5C00]" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-[#00C853]" />
                )}
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#888D96]">{c.interval}</span>
                <h4 className="text-sm font-bold text-white tracking-tight">{c.title}</h4>
              </div>

              <p className="text-xs text-[#888D96] font-mono leading-normal min-h-[32px]">{c.description}</p>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-[#888D96]">Service Margin</span>
                  <span className={`font-semibold ${style.text}`}>
                    {c.dueDays !== undefined ? (
                      `${c.dueKm.toLocaleString()} km / ${c.dueDays} days left`
                    ) : (
                      `${c.dueKm.toLocaleString()} km left`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0A0B0D] overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      c.status === 'DUE' ? 'bg-red-500' : c.status === 'WARNING' ? 'bg-[#FF5C00]' : 'bg-[#00C853]'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-[#888D96] font-mono mt-1 border-t border-[#2A2D35] pt-1.5">
                <span>{c.lastText}</span>
                <span className="uppercase text-zinc-400 font-bold tracking-wider">{c.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Maintenance Logbook Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#E0E0E0] font-bold">
            Service Events Journal Ledger
          </h3>
          <span className="font-mono text-[9.5px] text-[#888D96] bg-[#16181D] px-2 py-0.5 rounded border border-[#2A2D35]">
            Total Entries: {displayLogs.length}
          </span>
        </div>

        {displayLogs.length === 0 ? (
          <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-8 text-center space-y-2">
            <Wrench className="h-6 w-6 text-[#888D96] mx-auto opacity-45" />
            <p className="font-mono text-xs text-[#888D96]">No service events logged in vault diary.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 relative overflow-hidden transition-all duration-150">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-2.5 flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-[#888D96] flex items-center space-x-1 bg-[#0A0B0D] px-2 py-0.5 rounded border border-zinc-800">
                          <Calendar className="h-3 w-3 inline text-[#FF5C00]" />
                          <span>{log.date}</span>
                        </span>
                        <span className="font-mono text-[10px] bg-[#0A0B0D] text-[#E0E0E0] px-2 py-0.5 rounded border border-[#2A2D35] flex items-center space-x-1">
                          <Gauge className="h-3 w-3 text-[#FF5C00]" />
                          <span>{log.odo.toLocaleString()} km</span>
                        </span>
                        <span className="font-mono text-[10px] bg-[#0A0B0D] text-[#E0E0E0] px-2 py-0.5 rounded border border-[#2A2D35] flex items-center space-x-1 font-semibold text-zinc-300">
                          <Building2 className="h-3 w-3 text-[#FF5C00]" />
                          <span>{log.serviceCenter}</span>
                        </span>
                        {log.totalCost > 0 && (
                          <span className="font-mono text-[10px] bg-[#00C853]/5 text-[#00C853] px-2 py-0.5 rounded border border-[#00C853]/20 flex items-center space-x-0.5 font-bold">
                            <IndianRupee className="h-2.5 w-2.5" />
                            <span>₹{log.totalCost.toLocaleString()}</span>
                          </span>
                        )}
                      </div>

                      {/* Tasks chip list */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {log.tasksPerformed.map((tsk, tIndex) => (
                          <span 
                            key={tIndex} 
                            className="font-mono text-[8.5px] bg-zinc-800/50 text-[#E0E0E0] px-2 py-0.5 rounded border border-zinc-700/50 uppercase tracking-wide flex items-center space-x-1"
                          >
                            <span className="h-1 w-1 bg-[#FF5C00] rounded-full shrink-0" />
                            <span>{tsk}</span>
                          </span>
                        ))}
                      </div>

                      {/* Display short notes inline */}
                      {log.notes && !isExpanded && (
                        <p className="text-[11px] font-mono text-zinc-400 line-clamp-1 italic bg-[#0A0B0D]/40 p-1.5 rounded border border-zinc-800/40">
                          Memo: {log.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-[#2A2D35] md:border-transparent pt-3 md:pt-0 self-stretch justify-end">
                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="rounded-lg bg-[#0A0B0D] border border-[#2A2D35] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide text-[#888D96] hover:text-white hover:border-zinc-700 transition flex items-center space-x-1 cursor-pointer"
                        title={isExpanded ? "Collapse details" : "Expand memo & receipts"}
                      >
                        <span>{isExpanded ? "Collapse" : "Details"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {/* File Bill Action Button */}
                      {log.billPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setActiveBillUrl(log.billPhotoUrl || null)}
                          className="rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 p-2 text-[#FF5C00] hover:bg-[#FF5C00]/20 transition flex items-center justify-center cursor-pointer"
                          title="View Invoice Receipt Document"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(log.id)}
                        className="rounded-lg bg-[#0A0B0D] border border-zinc-800 p-2 text-[#888D96] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition cursor-pointer"
                        title="Delete service log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded block showing full memo & bill thumbnail */}
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-[#2A2D35] space-y-3"
                    >
                      {log.notes && (
                        <div className="space-y-1">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-[#FF5C00] block">Service Notes</span>
                          <p className="text-xs text-[#E0E0E0] font-mono leading-relaxed bg-[#0A0B0D] border border-[#2A2D35] rounded-lg p-3">
                            {log.notes}
                          </p>
                        </div>
                      )}

                      {log.billPhotoUrl && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0A0B0D] border border-[#2A2D35] rounded-lg p-3">
                          <div className="flex items-center space-x-3.5">
                            <div className="h-10 w-10 border border-[#2A2D35] rounded overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center">
                              <img 
                                src={log.billPhotoUrl} 
                                alt="bill thumbnail" 
                                className="object-cover h-full w-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white font-mono">Invoice Receipt Attached</p>
                              <p className="text-[10px] font-mono text-[#888D96]">Click View to scale out the document or store locally</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveBillUrl(log.billPhotoUrl || null)}
                            className="w-full sm:w-auto rounded-lg bg-[#FF5C00] px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold text-black hover:bg-[#FF5C00]/95 flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Document</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill Vault Large Zoom Modal Dialog Popup */}
      <AnimatePresence>
        {activeBillUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-h-[90vh] max-w-[500px] w-full rounded-2xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3 mb-4 shrink-0">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-[#FF5C00]" />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Invoice Bill Receipt</span>
                </div>
                <button
                  onClick={() => setActiveBillUrl(null)}
                  className="rounded-lg border border-[#2A2D35]/60 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable image viewer body */}
              <div className="overflow-y-auto flex-1 rounded-lg border border-[#2A2D35] bg-[#0A0B0D] p-2 flex items-center justify-center min-h-[250px]">
                <img 
                  src={activeBillUrl} 
                  alt="Invoice zoom" 
                  className="max-h-[50vh] object-contain w-full rounded"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-[#2A2D35] flex gap-2 shrink-0">
                <a
                  href={activeBillUrl}
                  download="motovault-service-bill.png"
                  className="w-full rounded-lg bg-[#FF5C00]/15 border border-[#FF5C00]/25 px-4 py-2 text-center text-xs font-mono text-[#FF5C00] font-bold uppercase tracking-wider hover:bg-[#FF5C00]/20 flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Download Bill</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveBillUrl(null)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-center text-xs font-mono text-white hover:bg-zinc-700 flex items-center justify-center"
                >
                  <span>Close Window</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
