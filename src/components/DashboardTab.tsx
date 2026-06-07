/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MotoVaultState, DocumentCategory, TrackingMethod } from '../types';
import { calculateMaintenance, getActiveAlerts, calculateFinancials } from '../utils/calculator';
import CustomChart from './CustomChart';
import { Wrench, ShieldAlert, Award, TrendingUp, IndianRupee, Bike, Edit3, Check } from 'lucide-react';

interface DashboardTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
  onNavigate: (tabId: string) => void;
}

export default function DashboardTab({ state, onUpdateState, onNavigate }: DashboardTabProps) {
  const [isEditingBike, setIsEditingBike] = useState(false);
  const [tempName, setTempName] = useState(state.bikeName);
  const [tempModel, setTempModel] = useState(state.bikeModel);
  const [tempPurchasePrice, setTempPurchasePrice] = useState<number | ''>(state.bikePurchasePrice || 0);

  // Calculate maintenance profiles
  const maintStatus = calculateMaintenance(state.currentOdo, state.maintenanceEvents);
  const activeAlerts = getActiveAlerts(state.currentOdo, maintStatus, state.documents);

  // Compute stats
  const financials = calculateFinancials(
    state.currentOdo,
    state.fuelLogs,
    state.maintenanceEvents,
    state.garageMods,
    state.documents,
    state.miscExpenses || [],
    state.bikePurchasePrice
  );

  const sortedFuelLogs = [...state.fuelLogs].sort((a, b) => a.currentOdo - b.currentOdo);

  // 1. Current Average: Most recent log with calculatedAverage !== null
  const logsWithAvg = sortedFuelLogs.filter(l => l.calculatedAverage !== null);
  const currentAverage = logsWithAvg.length > 0 
    ? logsWithAvg[logsWithAvg.length - 1].calculatedAverage 
    : null;

  // 2. Lifetime Average: Sum of all calculated averages divided by count
  const lifetimeAverage = logsWithAvg.length > 0
    ? Number((logsWithAvg.reduce((sum, log) => sum + (log.calculatedAverage || 0), 0) / logsWithAvg.length).toFixed(2))
    : null;

  // 3. Running Cost (₹/km): total cost / total distance elapsed since first log
  let runningCostPerKm: string = 'N/A';
  if (sortedFuelLogs.length >= 2) {
    const firstLog = sortedFuelLogs[0];
    const lastLog = sortedFuelLogs[sortedFuelLogs.length - 1];
    const totalDistance = lastLog.currentOdo - firstLog.currentOdo;
    
    // Sum all costs poured in from second log onwards (since first log is baseline establishing point, or sum all costs in between)
    // Actually, sum of all costs since baseline is the most mathematically clean representation
    let totalCost = 0;
    for (let i = 1; i < sortedFuelLogs.length; i++) {
      if (!sortedFuelLogs[i].isStandaloneAverage) {
        totalCost += sortedFuelLogs[i].totalCost;
      }
    }

    if (totalDistance > 0) {
      runningCostPerKm = `₹ ${(totalCost / totalDistance).toFixed(2)}`;
    }
  }

  // 4. Mods Budget: Sum of "price" for all mods marked wishlist with High Priority
  const highPriorityModsCost = state.garageMods
    .filter(mod => mod.status === 'Wishlist' && mod.priority === 'High')
    .reduce((sum, mod) => sum + mod.price, 0);

  const handleSaveBike = () => {
    onUpdateState({
      bikeName: tempName || 'My Cruiser',
      bikeModel: tempModel || 'Motorcycle',
      bikePurchasePrice: tempPurchasePrice === '' ? 0 : Number(tempPurchasePrice)
    });
    setIsEditingBike(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Rider's Garage Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#2A2D35] bg-[#16181D] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2D35]/50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center justify-center rounded bg-[#FF5C00]/10 p-1.5 text-[#FF5C00]">
                <Bike className="h-4 w-4" />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FF5C00] font-bold">Active Ride</p>
            </div>
            
            {isEditingBike ? (
              <div className="flex flex-col sm:flex-row gap-2.5 mt-2 max-w-xl items-end">
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <span className="font-mono text-[8px] text-[#888D96] uppercase">Name</span>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Ride Display Name"
                    className="rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-1.5 font-mono text-xs text-[#E0E0E0] placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <span className="font-mono text-[8px] text-[#888D96] uppercase">Model</span>
                  <input
                    type="text"
                    value={tempModel}
                    onChange={(e) => setTempModel(e.target.value)}
                    placeholder="Make & Model"
                    className="rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-1.5 font-mono text-xs text-[#E0E0E0] placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <span className="font-mono text-[8px] text-[#888D96] uppercase">Purchase Price (₹)</span>
                  <input
                    type="number"
                    value={tempPurchasePrice}
                    onChange={(e) => setTempPurchasePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="Bike Purchase Price"
                    className="rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-1.5 font-mono text-xs text-[#E0E0E0] placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none w-full"
                  />
                </div>
                <button
                  onClick={handleSaveBike}
                  className="rounded-lg bg-[#FF5C00] px-3 py-1.5 text-black hover:bg-[#FF5C00]/90 transition flex items-center justify-center font-bold font-mono h-[32px] sm:h-[34px] min-w-[34px]"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pt-1">
                <h1 className="text-xl font-bold tracking-tight text-white">{state.bikeName}</h1>
                <button 
                  onClick={() => {
                    setTempName(state.bikeName);
                    setTempModel(state.bikeModel);
                    setTempPurchasePrice(state.bikePurchasePrice !== undefined ? state.bikePurchasePrice : 0);
                    setIsEditingBike(true);
                  }}
                  className="text-[#888D96] hover:text-[#FF5C00] p-1 transition"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            
            {!isEditingBike && (
              <p className="font-mono text-xs text-[#888D96]">{state.bikeModel}</p>
            )}
          </div>
        </div>

        {/* Dynamic Metric Multi-Columns Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-4 font-mono">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#888D96]">Total Spend</p>
            <p className="text-sm sm:text-lg font-bold text-[#00C853] mt-1 truncate">
              ₹{financials.totalExpense.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#888D96]">Life Cost/km</p>
            <p className="text-sm sm:text-lg font-bold text-[#FF5C00] mt-1 truncate">
              ₹{financials.costPerKm.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#888D96]">Odometer</p>
            <p className="text-sm sm:text-lg font-bold text-white mt-1 truncate">
              {state.currentOdo.toLocaleString('en-IN')}{' '}
              <span className="text-[10px] text-[#888D96] font-normal">km</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Fuel Performance Visual Chart */}
      <CustomChart logs={state.fuelLogs} />

      {/* 3. Rider's Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Avg */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-2">Current Average</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {currentAverage !== null ? currentAverage : 'N/A'}
            </span>
            <span className="text-xs text-[#888D96]">km/L</span>
          </div>
          <p className="font-mono text-[9px] text-[#888D96] mt-2">Last full tank fillup</p>
        </div>

        {/* Lifetime Avg */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-2">Lifetime Average</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#00C853]">
              {lifetimeAverage !== null ? lifetimeAverage : 'N/A'}
            </span>
            <span className="text-xs text-[#888D96]">km/L</span>
          </div>
          <p className="font-mono text-[9px] text-[#888D96] mt-2">Across all logged rides</p>
        </div>

        {/* Running Cost */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-2">Running Cost</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {runningCostPerKm.replace('₹ ', '₹')}
            </span>
            <span className="text-xs text-[#888D96]">/km</span>
          </div>
          <p className="font-mono text-[9px] text-[#888D96] mt-2">Fuel cost per kilometer</p>
        </div>

        {/* Mods Active Budget */}
        <div className="p-5 rounded-xl border border-[#2A2D35] bg-[#16181D] relative overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-[#888D96] mb-2">Mods Budget (High)</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#FF5C00]">
              ₹ {highPriorityModsCost.toLocaleString()}
            </span>
          </div>
          <p className="font-mono text-[9px] text-[#888D96] mt-2">Wishlist high priorities</p>
        </div>
      </div>

      {/* 4. Real-time Rider Alerts & Document Reminders */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00]"></div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#E0E0E0] font-bold">
            Active Operations Board
          </h3>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-6 text-center">
            <p className="font-mono text-xs text-[#888D96]">All systems green! No outstanding maintenance or document alert thresholds reached.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="flex items-start gap-4 rounded-xl border border-[#2A2D35] bg-[#16181D] p-4 shadow-sm relative overflow-hidden group hover:border-[#FF5C00]/40 transition-all"
              >
                {/* Clean uppercase tag resembling design HTML styles visually */}
                <div className={`p-2 rounded font-mono font-bold text-[10.5px] uppercase tracking-wider text-center min-w-[48px] ${
                  alert.severity === 'URGENT' 
                    ? 'bg-[#D32F2F]/20 text-[#D32F2F]'
                    : alert.type === 'DOCUMENT'
                      ? 'bg-[#2A2D35] text-[#FF5C00]'
                      : 'bg-[#2A2D35] text-[#FFC107]'
                }`}>
                  {alert.type.substring(0, 3)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold text-[#888D96] uppercase tracking-widest">
                      {alert.severity}
                    </span>
                    <span className="font-mono text-[10px] text-[#888D96]">
                      {alert.daysLeft !== undefined ? (
                        alert.daysLeft <= 0 
                          ? 'Expired' 
                          : `${alert.daysLeft} days left`
                      ) : alert.kmLeft !== undefined ? (
                        alert.kmLeft <= 0 
                          ? 'Overdue' 
                          : `${alert.kmLeft} km left`
                      ) : null}
                    </span>
                  </div>
                  
                  <h4 className="text-xs font-bold text-white tracking-tight leading-normal">
                    {alert.title}
                  </h4>
                  <p className="text-[11px] text-[#888D96] leading-normal">
                    {alert.description}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate(alert.type === 'DOCUMENT' ? 'documents' : 'maintenance')}
                      className={`font-mono text-[9px] uppercase tracking-widest font-bold cursor-pointer transition flex items-center gap-1 ${
                        alert.severity === 'URGENT' ? 'text-[#D32F2F]' : 'text-[#FF5C00]'
                      }`}
                    >
                      Resolve check &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
