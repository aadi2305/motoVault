/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MotoVaultState, ModificationItem, ModCategory, ModStatus, ModPriority } from '../types';
import { Plus, Trash2, ArrowUpRight, IndianRupee, Eye, Sparkles, Check, ListFilter, AlertCircle, ShoppingCart } from 'lucide-react';

interface ModsGarageTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
}

export default function ModsGarageTab({ state, onUpdateState }: ModsGarageTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ModCategory>(ModCategory.PROTECTION);
  const [status, setStatus] = useState<ModStatus>(ModStatus.WISHLIST);
  const [priority, setPriority] = useState<ModPriority>(ModPriority.HIGH);
  const [price, setPrice] = useState<number | ''>('');
  const [source, setSource] = useState('');
  const [installationOdo, setInstallationOdo] = useState<number | ''>('');

  // Active filter
  const [activeFilter, setActiveFilter] = useState<'All' | ModStatus>('All');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Bike Modification Name is required.");
      return;
    }

    const estimatedPrice = Number(price);
    if (isNaN(estimatedPrice) || estimatedPrice < 0) {
      setErrorMsg("Price must be a valid, positive currency amount.");
      return;
    }

    // Capture installation ODO
    let customInstOdo: number | undefined = undefined;
    if (status === ModStatus.INSTALLED) {
      customInstOdo = installationOdo !== '' ? Number(installationOdo) : state.currentOdo;
    }

    const newMod: ModificationItem = {
      id: `mod-${Date.now()}`,
      name: name.trim(),
      category,
      status,
      priority,
      price: estimatedPrice,
      source: source.trim() || 'Vendor Store',
      installationOdo: customInstOdo
    };

    onUpdateState({
      garageMods: [...state.garageMods, newMod]
    });

    // Reset Form
    setName('');
    setPrice('');
    setSource('');
    setInstallationOdo('');
    setShowAddForm(false);
  };

  const handleUpdateStatus = (id: string, newStatus: ModStatus) => {
    const updatedMods = state.garageMods.map(mod => {
      if (mod.id === id) {
        // LOGIC: If status changes to "Installed", automatically record the current Odometer
        const isTransitioningToInstalled = newStatus === ModStatus.INSTALLED && mod.status !== ModStatus.INSTALLED;
        return {
          ...mod,
          status: newStatus,
          installationOdo: isTransitioningToInstalled ? state.currentOdo : mod.installationOdo
        };
      }
      return mod;
    });

    onUpdateState({
      garageMods: updatedMods
    });
  };

  const handleDelete = (id: string) => {
    const updated = state.garageMods.filter(mod => mod.id !== id);
    onUpdateState({
      garageMods: updated
    });
  };

  const filteredMods = activeFilter === 'All'
    ? state.garageMods
    : state.garageMods.filter(m => m.status === activeFilter);

  // Stats summaries
  const wishlistCost = state.garageMods
    .filter(m => m.status === ModStatus.WISHLIST)
    .reduce((sum, m) => sum + m.price, 0);

  const installedCost = state.garageMods
    .filter(m => m.status === ModStatus.INSTALLED)
    .reduce((sum, m) => sum + m.price, 0);

  const orderedCost = state.garageMods
    .filter(m => m.status === ModStatus.ORDERED)
    .reduce((sum, m) => sum + m.price, 0);

  return (
    <div className="space-y-6">
      {/* Header and buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Modifications Garage</h2>
          <p className="font-mono text-[11px] text-[#888D96] font-normal">Active wishlist prioritizations, cost estimates, and customizations lifespans</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center space-x-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-lg transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showAddForm ? 'Close panel' : 'Add Custom mod'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex gap-2.5 rounded-xl border border-red-500/25 bg-red-950/25 p-4 text-xs font-mono text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <div>
            <p className="font-bold">Add Fail</p>
            <p className="text-red-400/90 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Modifications form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-xl space-y-4">
          <h3 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00]">
            Designate Custom Modification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Upgrade Name*</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Barkbusters, Zana crashbar"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Mod Classification</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ModCategory)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
              >
                <option value={ModCategory.TOURING}>Touring (Luggage, wind protection)</option>
                <option value={ModCategory.PROTECTION}>Protection (Crash guards, skid plate)</option>
                <option value={ModCategory.ELECTRICALS}>Electricals (Spotlights, Horns, Chargers)</option>
                <option value={ModCategory.PERFORMANCE}>Performance (Filtres, Exhaust, Tuners)</option>
                <option value={ModCategory.COSMETICS}>Cosmetics (Wraps, Levers, Visors)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Current Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ModStatus)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
              >
                <option value={ModStatus.WISHLIST}>Wishlist (Goal target)</option>
                <option value={ModStatus.ORDERED}>Ordered (Shipping)</option>
                <option value={ModStatus.INSTALLED}>Installed (On motorcycle)</option>
              </select>
            </div>

            <div className="space-y-1 block">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Wishlist Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ModPriority)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
              >
                <option value={ModPriority.HIGH}>High Impact</option>
                <option value={ModPriority.MEDIUM}>Medium Impact</option>
                <option value={ModPriority.LOW}>Low/Optional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Price (INR ₹)*</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="Product Cost (₹)"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Source shop / Vendor Link</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Store or link representation"
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            {status === ModStatus.INSTALLED && (
              <div className="space-y-1 sm:col-span-3">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Installation ODO (km) <span className="text-zinc-650">(Defaults to Bike's Current ODO: {state.currentOdo} km)</span></label>
                <input
                  type="number"
                  value={installationOdo}
                  onChange={(e) => setInstallationOdo(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder={`Current ODO: ${state.currentOdo}`}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#2A2D35]">
            <button
              type="submit"
              className="rounded-lg bg-[#FF5C00] px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-md transition"
            >
              Secure mod specification
            </button>
          </div>
        </form>
      )}

      {/* Ledger Cost Summaries Widgets bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Installed */}
        <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 text-center">
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#FF5C00]">Already spent</p>
          <p className="text-xl font-bold font-mono text-white mt-1">₹{installedCost.toLocaleString('en-IN')}</p>
          <span className="font-mono text-[9px] text-[#888D96] block mt-0.5">Installed parts value</span>
        </div>

        {/* Ordered */}
        <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 text-center">
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#888D96]">In Transit</p>
          <p className="text-xl font-bold font-mono text-[#FF5C00] mt-1">₹{orderedCost.toLocaleString('en-IN')}</p>
          <span className="font-mono text-[9px] text-[#888D96] block mt-0.5 font-bold uppercase">Ordered</span>
        </div>

        {/* Wishlist */}
        <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 text-center">
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Wishlist budget</p>
          <p className="text-xl font-bold font-mono text-zinc-300 mt-1">₹{wishlistCost.toLocaleString('en-IN')}</p>
          <span className="font-mono text-[9px] text-[#888D96] block mt-0.5 font-semibold">Total backlog</span>
        </div>
      </div>

      {/* Filters toggler bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35] pb-3">
        <label className="font-mono text-xs text-[#E0E0E0] font-semibold flex items-center space-x-1.5 uppercase tracking-wider">
          <ListFilter className="h-3.5 w-3.5 text-[#FF5C00]" />
          <span>Upgrade pipeline:</span>
        </label>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono w-full sm:w-auto">
          {(['All', ModStatus.WISHLIST, ModStatus.ORDERED, ModStatus.INSTALLED] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider text-[10px] flex-1 sm:flex-initial text-center ${
                activeFilter === lvl 
                  ? 'bg-[#FF5C00] text-black font-bold shadow-md' 
                  : 'text-[#888D96] bg-[#16181D]/40 border border-[#2A2D35] hover:text-white hover:bg-[#16181D]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Modifications List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMods.map((mod) => {
          // Calculate running lifespan kilometers if installed
          const lifespan = mod.status === ModStatus.INSTALLED && mod.installationOdo !== undefined && mod.installationOdo !== null
            ? state.currentOdo - mod.installationOdo
            : null;

          return (
            <div key={mod.id} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 flex flex-col justify-between space-y-4">
              
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[9px] tracking-widest text-[#888D96] uppercase font-bold">
                      {mod.category}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-tight leading-tight">
                      {mod.name}
                    </h3>
                  </div>

                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${
                    mod.priority === ModPriority.HIGH
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : mod.priority === ModPriority.MEDIUM
                        ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00]'
                        : 'bg-[#0A0B0D] border border-[#2A2D35] text-[#888D96]'
                  }`}>
                    {mod.priority} Impact
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  <span className="text-white font-bold bg-[#0A0B0D] px-2 py-0.5 rounded border border-[#2A2D35]">
                    ₹ {mod.price.toLocaleString()}
                  </span>
                  <span className="text-[#888D96]">Source: <b className="text-[#E0E0E0]">{mod.source}</b></span>
                </div>

                {/* Lifespan analytics */}
                {mod.status === ModStatus.INSTALLED && (
                  <div className="bg-[#0A0B0D] border border-[#2A2D35] rounded-lg p-2.5 font-mono text-[10px] space-y-0.5">
                    <p className="text-[#888D96] flex justify-between">
                      <span>Installed Odo:</span>
                      <span className="text-[#E0E0E0] font-bold">{mod.installationOdo} km</span>
                    </p>
                    <p className="text-[#888D96] flex justify-between font-bold">
                      <span>Lifespan mileage:</span>
                      <span className="text-[#00C853] font-bold font-mono">
                        {lifespan ? `${lifespan.toLocaleString()} km` : '0 km'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Status Update Options */}
              <div className="flex items-center justify-between border-t border-[#2A2D35] pt-3">
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-[9px] text-[#888D96] mr-2 uppercase">Status:</span>
                  {(['Wishlist', 'Ordered', 'Installed'] as const).map((stat) => (
                    <button
                      key={stat}
                      onClick={() => handleUpdateStatus(mod.id, stat as ModStatus)}
                      className={`font-mono text-[9px] px-2 py-1 rounded transition cursor-pointer font-bold ${
                        mod.status === stat
                          ? 'bg-[#0A0B0D] text-[#FF5C00] font-bold border border-[#FF5C00]/20 shadow-xs'
                          : 'text-[#888D96] border border-transparent hover:border-[#2A2D35] hover:text-[#E0E0E0]'
                      }`}
                    >
                      {stat}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleDelete(mod.id)}
                  className="rounded-lg bg-[#0A0B0D] hover:bg-red-500/5 hover:text-red-500 border border-[#2A2D35] p-2 text-[#888D96] transition cursor-pointer"
                  title="Remove upgrade item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredMods.length === 0 && (
        <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-10 text-center">
          <p className="font-mono text-xs text-[#888D96]">No modification upgrades match the active filter pipeline.</p>
        </div>
      )}
    </div>
  );
}
