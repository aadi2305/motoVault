/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MotoVaultState, FuelLog, TrackingMethod } from '../types';
import { recalculateFuelAverages } from '../utils/calculator';
import { Plus, Trash2, Fuel, ShieldOff, AlertTriangle, HelpCircle, Check, Info } from 'lucide-react';

interface FuelTabProps {
  state: MotoVaultState;
  onUpdateState: (newState: Partial<MotoVaultState>) => void;
}

export default function FuelTab({ state, onUpdateState }: FuelTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentOdo, setCurrentOdo] = useState<number | ''>('');
  const [tripA, setTripA] = useState<number | ''>('');
  const [fuelLiters, setFuelLiters] = useState<number | ''>('');
  const [totalCost, setTotalCost] = useState<number | ''>('');
  const [fuelStation, setFuelStation] = useState('');
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>(TrackingMethod.TANK_TO_TANK);
  
  // Standalone record toggle
  const [isStandaloneAverage, setIsStandaloneAverage] = useState(false);
  const [standaloneAverage, setStandaloneAverage] = useState<number | ''>('');

  // Sort logs by ODO descending to display newer first
  const displayLogs = [...state.fuelLogs].sort((a, b) => b.currentOdo - a.currentOdo);
  const sortedAscLogs = [...state.fuelLogs].sort((a, b) => a.currentOdo - b.currentOdo);
  const maxOdo = sortedAscLogs.length > 0 ? sortedAscLogs[sortedAscLogs.length - 1].currentOdo : 0;

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const enteredOdo = Number(currentOdo);
    
    if (isNaN(enteredOdo) || enteredOdo <= 0) {
      setErrorMsg("Odometer reading must be a valid positive number.");
      return;
    }

    // LOGIC 1 (Validation & Baseline): Hard block if ODO is less than or equal to previous max ODO in database
    if (state.fuelLogs.length > 0 && enteredOdo <= maxOdo) {
      setErrorMsg(`Current ODO must be higher than ${maxOdo.toLocaleString('en-US')}.`);
      return;
    }

    let newLog: FuelLog;

    if (isStandaloneAverage) {
      const avg = Number(standaloneAverage);
      if (isNaN(avg) || avg <= 0) {
        setErrorMsg("Average must be a valid positive mileage.");
        return;
      }
      newLog = {
        id: `f-${Date.now()}`,
        date,
        currentOdo: enteredOdo,
        fuelLiters: 0,
        totalCost: 0,
        fuelStation: 'Standalone Input',
        trackingMethod: TrackingMethod.PARTIAL_FILL,
        isStandaloneAverage: true,
        standaloneAverage: avg,
        calculatedAverage: avg,
        warningFlag: null,
        isBrokenChain: false
      };
    } else {
      const liters = Number(fuelLiters);
      const cost = Number(totalCost);

      if (isNaN(liters) || liters <= 0) {
        setErrorMsg("Fuel volume (liters) must be a positive number.");
        return;
      }
      if (isNaN(cost) || cost < 0) {
        setErrorMsg("Total cost is required and cannot be negative.");
        return;
      }

      newLog = {
        id: `f-${Date.now()}`,
        date,
        currentOdo: enteredOdo,
        tripA: tripA !== '' ? Number(tripA) : undefined,
        fuelLiters: liters,
        totalCost: cost,
        fuelStation: fuelStation.trim() || 'Unknown Station',
        trackingMethod,
        isStandaloneAverage: false,
        calculatedAverage: null,
        warningFlag: null,
        isBrokenChain: false
      };
    }

    // Append to list, run re-computations and persist
    const rawList = [...state.fuelLogs, newLog];
    const calculatedList = recalculateFuelAverages(rawList);
    
    // Find the absolute highest Odo to keep current state sync'd
    const highestOdo = Math.max(...calculatedList.map(l => l.currentOdo));

    onUpdateState({
      fuelLogs: calculatedList,
      currentOdo: Math.max(state.currentOdo, highestOdo)
    });

    // Reset Form
    setCurrentOdo('');
    setTripA('');
    setFuelLiters('');
    setTotalCost('');
    setFuelStation('');
    setStandaloneAverage('');
    setIsStandaloneAverage(false);
    setShowAddForm(false);
  };

  const handleDeleteLog = (logId: string) => {
    const rawList = state.fuelLogs.filter(log => log.id !== logId);
    const calculatedList = recalculateFuelAverages(rawList);
    
    const highestOdo = calculatedList.length > 0 
      ? Math.max(...calculatedList.map(l => l.currentOdo))
      : state.currentOdo;

    onUpdateState({
      fuelLogs: calculatedList,
      currentOdo: highestOdo
    });
  };

  const handleBreakChain = (logId: string) => {
    // Break chain resets tracking at this point
    const updatedList = state.fuelLogs.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          isBrokenChain: !log.isBrokenChain // Toggle chain split
        };
      }
      return log;
    });

    onUpdateState({
      fuelLogs: recalculateFuelAverages(updatedList)
    });
  };

  // Trip A validator display helper
  const renderTripAValidation = (log: FuelLog) => {
    if (log.isStandaloneAverage || log.tripA === undefined) return null;
    
    // Find previous log to compare odometer difference
    const ascLogs = [...state.fuelLogs].sort((a, b) => a.currentOdo - b.currentOdo);
    const idx = ascLogs.findIndex(l => l.id === log.id);
    if (idx <= 0) return null;

    const prevLog = ascLogs[idx - 1];
    const expectedDistance = log.currentOdo - prevLog.currentOdo;
    const isWithinTolerance = Math.abs((log.tripA || 0) - expectedDistance) <= 2;

    return (
      <div className="mt-1 flex items-center space-x-1.5 font-mono text-[9px]">
        <span className="text-zinc-500">Trip A Validation:</span>
        {isWithinTolerance ? (
          <span className="text-emerald-500 bg-emerald-950/20 px-1 py-0.2 rounded border border-emerald-900/30 flex items-center gap-0.5">
            <Check className="h-2.5 w-2.5" /> Matched ({log.tripA} km)
          </span>
        ) : (
          <span className="text-amber-500 bg-amber-950/20 px-1 py-0.2 rounded border border-amber-900/30 flex items-center gap-0.5" title={`Trip A is ${log.tripA} km, but expected is ${expectedDistance} km based on ODO. Expected ODO difference is used to secure calculations.`}>
            <Info className="h-2.5 w-2.5" /> Forgotten Reset ({log.tripA} km, Expected: {expectedDistance} km)
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tracker Hero Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Fuel & Mileage Logbook</h2>
          <p className="font-mono text-[11px] text-[#888D96]">Strict rule-bound mileage, cost analysis, and outlier protection</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center space-x-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-lg transition-all duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showAddForm ? 'Close panel' : 'Log Refuel'}</span>
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

      {/* Forms Section */}
      {showAddForm && (
        <form onSubmit={handleSubmitLog} className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
            <h3 className="font-bold font-mono text-xs uppercase tracking-widest text-[#FF5C00] flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5" /> Add Log Checkpoint
            </h3>
            
            {/* Form Mode Toggle */}
            <label className="flex items-center space-x-2 text-[10px] font-mono text-[#888D96] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isStandaloneAverage}
                onChange={(e) => {
                  setErrorMsg(null);
                  setIsStandaloneAverage(e.target.checked);
                }}
                className="rounded border-[#2A2D35] bg-[#0A0B0D] text-[#FF5C00] focus:ring-0 cursor-pointer"
              />
              <span>standalone mileage override</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Date field */}
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            {/* Current ODO */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Current ODO (km)*</label>
                {maxOdo > 0 && <span className="text-[9px] text-[#888D96] font-mono">prev Max: {maxOdo}</span>}
              </div>
              <input
                type="number"
                required
                inputMode="numeric"
                placeholder={maxOdo > 0 ? `Must exceeds ${maxOdo} km` : "Odometer Reading"}
                value={currentOdo}
                onChange={(e) => setCurrentOdo(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
              />
            </div>

            {isStandaloneAverage ? (
              /* Standalone Mileage Input */
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Standalone Average (km/L)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  inputMode="decimal"
                  placeholder="e.g. 35.5"
                  value={standaloneAverage}
                  onChange={(e) => setStandaloneAverage(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
                />
              </div>
            ) : (
              /* Fuel Liters field */
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Fuel Liters</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  inputMode="decimal"
                  placeholder="Liters added"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
                />
              </div>
            )}

            {!isStandaloneAverage && (
              <>
                {/* Trip A */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Trip A (km) <span className="text-zinc-600">optional</span></label>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Compare vs ODO (+/-2 km)"
                    value={tripA}
                    onChange={(e) => setTripA(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>

                {/* Total Cost */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Total Cost (₹)</label>
                  <input
                    type="number"
                    required
                    inputMode="numeric"
                    placeholder="Amount Paid (₹)"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>

                {/* Fuel Station */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Fuel Station name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shell, Indian Oil"
                    value={fuelStation}
                    onChange={(e) => setFuelStation(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] placeholder-zinc-700 focus:border-[#FF5C00] focus:outline-none"
                  />
                </div>

                {/* Tracking Method */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#888D96]">Tracking Method</label>
                  <select
                    value={trackingMethod}
                    onChange={(e) => setTrackingMethod(e.target.value as TrackingMethod)}
                    className="w-full rounded-lg border border-[#2A2D35] bg-[#0A0B0D] px-3 py-2 font-mono text-xs text-[#E0E0E0] focus:border-[#FF5C00] focus:outline-none cursor-pointer"
                  >
                    <option value={TrackingMethod.TANK_TO_TANK}>Tank-to-Tank (Full Fill)</option>
                    <option value={TrackingMethod.RESERVE_TO_RESERVE}>Reserve-to-Reserve (Many Indian riders' standard)</option>
                    <option value={TrackingMethod.PARTIAL_FILL}>Partial Fill (Set average to N/A)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#2A2D35]">
            <button
              type="submit"
              className="rounded-lg bg-[#FF5C00] px-5 py-2 font-mono text-[10px] uppercase tracking-widest font-bold text-black hover:bg-[#FF5C00]/90 cursor-pointer shadow-md transition"
            >
              Confirm Log
            </button>
          </div>
        </form>
      )}

      {/* Logs Dashboard Panel */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#E0E0E0] font-bold">
          Historical Checkpoint Registry
        </h3>

        {displayLogs.length === 0 ? (
          <div className="rounded-xl border border-[#2A2D35] bg-[#16181D] p-8 text-center">
            <p className="font-mono text-xs text-[#888D96]">No logs found on this motorcycle yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayLogs.map((log) => {
              const isFirst = log.id === sortedAscLogs[0]?.id;
              
              return (
                <div 
                  key={log.id} 
                  className={`rounded-xl border transition duration-150 p-4 ${
                    log.warningFlag 
                      ? 'bg-amber-950/5 border-amber-900/30' 
                      : 'bg-[#16181D] border-[#2A2D35]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Log Primary Info */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-[#888D96]">{log.date}</span>
                        <span className="font-mono text-[10px] bg-[#0A0B0D] text-[#E0E0E0] px-1.5 py-0.5 rounded border border-[#2A2D35]">
                          ODO: {log.currentOdo.toLocaleString()} km
                        </span>
                        
                        {log.isStandaloneAverage ? (
                          <span className="font-mono text-[9px] bg-sky-950/20 border border-sky-900/30 text-sky-400 px-1.5 py-0.5 rounded">
                            Standalone Avg Checkpoint
                          </span>
                        ) : (
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                            log.trackingMethod === TrackingMethod.TANK_TO_TANK
                              ? 'bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]'
                              : log.trackingMethod === TrackingMethod.RESERVE_TO_RESERVE
                                ? 'bg-amber-950/20 border-amber-900/30 text-amber-400'
                                : 'bg-[#0A0B0D] border-[#2A2D35] text-[#888D96]'
                          }`}>
                            {log.trackingMethod}
                          </span>
                        )}

                        {log.isBrokenChain && (
                          <span className="font-mono text-[9px] bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <ShieldOff className="h-2.5 w-2.5" /> Chain Split (Baseline)
                          </span>
                        )}
                      </div>

                      {!log.isStandaloneAverage && (
                        <p className="font-mono text-xs text-[#888D96]">
                          Litres added: <b className="text-[#E0E0E0]">{log.fuelLiters} L</b> | Cost: <b className="text-[#E0E0E0]">₹ {log.totalCost}</b> 
                          {log.fuelLiters > 0 && <span className="text-[#888D96]"> (₹ {(log.totalCost / log.fuelLiters).toFixed(2)}/L)</span>}
                        </p>
                      )}

                      {!log.isStandaloneAverage && log.fuelStation && (
                        <p className="text-[10px] text-[#888D96] font-mono uppercase tracking-wider">
                          Station: {log.fuelStation}
                        </p>
                      )}

                      {/* Display validation diagnostics */}
                      {renderTripAValidation(log)}
                    </div>

                    {/* Odometer Output Display */}
                    <div className="flex items-center space-x-4 self-stretch sm:self-auto justify-between border-t border-[#2A2D35] pt-3 sm:border-0 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-[#888D96]">Calculated Average</p>
                        <p className="text-base font-bold font-mono text-white mt-0.5">
                          {isFirst || log.isBrokenChain ? (
                            <span className="text-[#888D96] text-xs font-normal">Baseline Set (N/A)</span>
                          ) : log.calculatedAverage !== null ? (
                            <span>{log.calculatedAverage} <span className="text-xs font-normal text-[#888D96]">km/L</span></span>
                          ) : (
                            <span className="text-[#888D96] font-normal text-xs">N/A (Partial Fuel)</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Delete Action */}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="rounded-lg bg-[#0A0B0D] border border-[#2A2D35] p-2 text-[#888D96] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition cursor-pointer"
                          title="Delete fuel log entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning flagging & active overrides */}
                  {log.warningFlag && (
                    <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#2A2D35] pt-3 text-xs bg-amber-950/10 border border-amber-900/10 rounded-xl p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-400 font-mono">Outlier Detected ({log.calculatedAverage} km/L)</p>
                          <p className="text-zinc-400 font-mono text-[10px]">
                            This average falls outside realistic motorcycle mileage limits (10 - 65 km/L). Did you forget to enter an intermediate refuel log?
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleBreakChain(log.id)}
                        className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition shrink-0 cursor-pointer text-center ${
                          log.isBrokenChain
                            ? 'bg-[#FF5C00] border-[#FF5C00] text-black hover:bg-[#FF5C00]/90 font-bold'
                            : 'bg-[#0A0B0D] border-[#2A2D35] text-[#888D96] hover:border-[#FF5C00]/30 hover:text-[#FF5C00]'
                        }`}
                        title="Isolates calculations starting fresh from this ODO baseline to prevent older logging issues inflating statistics."
                      >
                        {log.isBrokenChain ? 'Chain Restored' : 'Break Chain (Isolate)'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
