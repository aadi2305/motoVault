/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MotoVaultState } from './types';
import { useSyncState } from './lib/useSyncState';
import DashboardTab from './components/DashboardTab';
import FuelTab from './components/FuelTab';
import MaintenanceTab from './components/MaintenanceTab';
import DocumentVaultTab from './components/DocumentVaultTab';
import ModsGarageTab from './components/ModsGarageTab';
import FinanceTab from './components/FinanceTab';

import { 
  LayoutDashboard, 
  Fuel, 
  Wrench, 
  FolderLock, 
  Settings, 
  RotateCcw, 
  Flame,
  Check,
  LogIn,
  LogOut,
  Database,
  Cloud,
  Loader2,
  Coins
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Setup & Onboarding State
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [setupBikeName, setSetupBikeName] = useState<string>('');
  const [setupBikeModel, setSetupBikeModel] = useState<string>('');
  const [setupCurrentOdo, setSetupCurrentOdo] = useState<number | ''>(0);
  const [setupBikePurchasePrice, setSetupBikePurchasePrice] = useState<number | ''>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const {
    state,
    user,
    loading,
    onUpdateState,
    loginWithGoogle,
    logout,
    resetToMock,
    clearToEmpty,
    isFirebaseConfigured
  } = useSyncState(showToast);

  const handleResetToMock = async () => {
    if (window.confirm("Restore sample Honda CB350RS logs for calculation reference? This resets active data.")) {
      await resetToMock();
      setActiveTab('dashboard');
    }
  };

  const handleClearToEmpty = () => {
    if (state) {
      setSetupBikeName(state.bikeName || '');
      setSetupBikeModel(state.bikeModel || '');
      setSetupCurrentOdo(state.currentOdo || 0);
      setSetupBikePurchasePrice(state.bikePurchasePrice || '');
    } else {
      setSetupBikePurchasePrice('');
    }
    setShowSetupModal(true);
  };

  const handlePerformSetupReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupBikeName.trim() || !setupBikeModel.trim()) {
      showToast("Bike Name and Model are required.");
      return;
    }
    
    const odoVal = setupCurrentOdo === '' ? 0 : Number(setupCurrentOdo);
    const purchaseVal = setupBikePurchasePrice === '' ? 0 : Number(setupBikePurchasePrice);
    
    const cleanState: MotoVaultState = {
      bikeName: setupBikeName.trim(),
      bikeModel: setupBikeModel.trim(),
      currentOdo: odoVal,
      bikePurchasePrice: purchaseVal,
      fuelLogs: [],
      maintenanceEvents: [],
      documents: [],
      garageMods: [],
      miscExpenses: []
    };
    
    await clearToEmpty(cleanState);
    setShowSetupModal(false);
    setActiveTab('dashboard');
  };

  if (loading || !state) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0A0B0D] text-[#FF5C00] font-mono text-xs gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5C00]" />
        <span>Initializing MotoVault Core Sync Engine...</span>
      </div>
    );
  }

  // Active Screen Selector
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab 
            state={state} 
            onUpdateState={onUpdateState} 
            onNavigate={(id) => setActiveTab(id)}
          />
        );
      case 'fuel':
        return <FuelTab state={state} onUpdateState={onUpdateState} />;
      case 'maintenance':
        return <MaintenanceTab state={state} onUpdateState={onUpdateState} />;
      case 'documents':
        return <DocumentVaultTab state={state} onUpdateState={onUpdateState} />;
      case 'garage':
        return <ModsGarageTab state={state} onUpdateState={onUpdateState} />;
      case 'finance':
        return <FinanceTab state={state} onUpdateState={onUpdateState} />;
      default:
        return <div className="p-4">Panel not resolved.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#E0E0E0] flex flex-col justify-between pb-24 lg:pb-6 relative md:p-6 p-0 selection:bg-[#FF5C00] selection:text-black">
      
      {/* Absolute Dynamic Slide-in Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#FF5C00] text-black px-4 py-2 rounded-full font-mono text-xs font-bold shadow-2xl flex items-center gap-1.5 animate-bounce">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Responsive Companion App shell Frame */}
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 bg-[#16181D]/60 border-0 md:border md:border-[#2A2D35] rounded-2xl md:shadow-2xl overflow-hidden relative">
        
        {/* Modern Top Header Dashboard Bar */}
        <header className="border-b border-[#2A2D35] bg-[#16181D]/50 backdrop-blur-md px-4 sm:px-5 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2.5">
            <span className="flex items-center justify-center p-2 rounded-lg bg-[#FF5C00]/10 text-[#FF5C00] shadow-inner">
              <Flame className="h-5 w-5 fill-[#FF5C00]/10" />
            </span>
            <div>
              <h1 className="text-sm font-black tracking-widest uppercase text-white font-mono flex items-center gap-1">
                MOTOVAULT<span className="text-[#FF5C00]">.</span>
              </h1>
              <span className="text-[10px] font-mono text-[#888D96] block uppercase tracking-wider">
                {state.bikeModel} • {state.currentOdo.toLocaleString()} km
              </span>
            </div>
          </div>

          {/* Quick Resets & Cloud Authentication bar */}
          <div className="flex items-center space-x-2">
            
            {/* Firebase Auth Controls */}
            {isFirebaseConfigured ? (
              user ? (
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[9px] font-mono text-[#FF5C00] font-bold flex items-center gap-1 bg-[#FF5C00]/10 border border-[#FF5C05]/20 px-1.5 py-0.5 rounded">
                      <Cloud className="h-3 w-3" /> CLOUD ACTIVE
                    </span>
                    <span className="text-[8px] font-mono text-[#888D96] max-w-[100px] truncate">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out of Google Backup"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 bg-zinc-900/50 hover:bg-zinc-900 border border-[#2A2D35] transition cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center space-x-1 sm:space-x-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/30 hover:border-[#FF5C00]/60 px-2.5 py-1.5 text-white transition cursor-pointer"
                  title="Connect Google Account for cloud backups"
                >
                  <Database className="h-3.5 w-3.5 text-[#FF5C00]" />
                  <span className="font-mono text-[9px] font-bold text-zinc-300 uppercase hidden xs:inline tracking-wider">Cloud sync</span>
                  <LogIn className="h-3 w-3 text-[#FF5C00] md:inline hidden" />
                </button>
              )
            ) : (
              <span className="text-[9px] font-mono text-[#888D96] bg-[#0A0B0D] border border-[#2A2D35] px-2 py-1 rounded-md hidden xs:inline uppercase tracking-widest font-semibold animate-pulse">
                Local Mode
              </span>
            )}

            <div className="h-6 w-px bg-[#2A2D35]" />

            <button
              onClick={handleResetToMock}
              title="Reset to Honda CB350RS reference sample data"
              className="p-1.5 sm:p-2 rounded-lg text-[#888D96] hover:text-[#FF5C00] bg-zinc-900/50 hover:bg-[#0A0B0D] border border-[#2A2D35] transition cursor-pointer flex items-center justify-center"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={handleClearToEmpty}
              title="Factory reset motorcycle details"
              className="p-1.5 sm:p-2 rounded-lg text-[#888D96] hover:text-red-500 bg-zinc-900/50 hover:bg-[#0A0B0D] border border-[#2A2D35] transition cursor-pointer flex items-center justify-center"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Navigation Panels Body with smooth viewport animations */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-140px)] select-text">
          {renderActiveTabContent()}
        </main>

        {/* Floating/Bottom Responsive Tab Navigator */}
        <nav 
          style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
          className="fixed bottom-0 left-0 right-0 z-40 md:sticky md:bottom-2 md:mx-auto md:max-w-xl md:mb-4 md:rounded-2xl border-t border-[#2A2D35] md:border md:border-[#2A2D35] bg-[#16181D]/95 backdrop-blur-md px-4 pt-2 md:pt-1.5 md:pb-1.5 shadow-2xl flex items-center justify-around"
        >
          
          {/* Tabs descriptor list */}
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fuel', label: 'Fuel', icon: Fuel },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'finance', label: 'Finance', icon: Coins },
            { id: 'documents', label: 'Vault', icon: FolderLock },
            { id: 'garage', label: 'Mods', icon: Settings },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'text-[#FF5C00] md:bg-[#0A0B0D] shadow-inner scale-102 font-bold' 
                    : 'text-[#888D96] hover:text-[#E0E0E0]'
                }`}
              >
                <IconComponent className="h-5 w-5 stroke-[2]" />
                <span className="font-mono text-[9px] mt-1 hidden xs:block">{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* 2. Premium Setup & Onboarding Reset Modal Dialog */}
      {showSetupModal && (
        <div id="motovault-setup-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2D35] bg-[#16181D] p-5 sm:p-6 shadow-2xl space-y-5">
            
            <div className="space-y-1.5 border-b border-[#2A2D35]/60 pb-3">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center justify-center rounded bg-[#FF5C00]/10 p-1.5 text-[#FF5C00]">
                  <Flame className="h-4 w-4" />
                </span>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#FF5C00] font-bold">MotoVault Initiation</p>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white font-sans uppercase">Initialize Live Ride</h2>
              <p className="text-xs text-[#888D96] leading-relaxed">
                Wipe all workspace checklists and establish the baseline metrics of your live motorcycle specs.
              </p>
            </div>

            <form onSubmit={handlePerformSetupReset} className="space-y-4">
              
              {/* Bike Name Input */}
              <div className="space-y-1">
                <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Motorcycle Alias / Nickname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carbon Explorer, Bullet, Red Scrambler"
                  value={setupBikeName}
                  onChange={(e) => setSetupBikeName(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3.5 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none min-h-[48px]"
                />
              </div>

              {/* Bike Model Input */}
              <div className="space-y-1">
                <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Make & Engine Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KTM 390 Adventure, Honda CB350RS"
                  value={setupBikeModel}
                  onChange={(e) => setSetupBikeModel(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3.5 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none min-h-[48px]"
                />
              </div>

              {/* Initial Odo Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Starting Odometer (km)</label>
                  <span className="font-mono text-[8px] text-[#888D96]">Zero is fine if brand new</span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min="0"
                  placeholder="Current reading (e.g. 12500)"
                  value={setupCurrentOdo}
                  onChange={(e) => setSetupCurrentOdo(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3.5 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none min-h-[48px]"
                />
              </div>

              {/* Bike Purchase Price Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Motorcycle Purchase Price (₹)</label>
                  <span className="font-mono text-[8px] text-[#888D96]">Optional; factored into lifetime cost</span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Cost of purchase (incl. taxes / registration)"
                  value={setupBikePurchasePrice}
                  onChange={(e) => setSetupBikePurchasePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3.5 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none min-h-[48px]"
                />
              </div>

              {/* Danger Warning Box */}
              <div className="p-3 bg-[#FF5C00]/5 border border-[#FF5C00]/10 rounded-lg text-[10px] text-[#FF5C00]/80 leading-relaxed font-mono">
                <span className="font-bold text-[#FF5C00] uppercase block mb-0.5">⚠️ Final Warning</span>
                This action is IRREVERSIBLE. Confirming this setup clears all current logs, checklists, fuel, and modification expenses across MotoVault and sets up this new machine.
              </div>

              {/* Actions Button panel */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4.5 py-3 bg-zinc-900 border border-[#2A2D35] text-[#888D96] hover:text-white rounded-lg text-xs font-mono font-bold transition min-h-[48px] cursor-pointer uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#FF5C00] text-black font-mono font-bold text-xs rounded-lg hover:bg-opacity-90 tracking-wide uppercase shadow-md flex items-center justify-center gap-1.5 transition min-h-[48px] cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Spin up Live Vault</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
