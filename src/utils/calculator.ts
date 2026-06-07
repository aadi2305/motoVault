/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FuelLog, TrackingMethod, MaintenanceEvent, DocumentRecord, DocumentCategory } from '../types';

/**
 * Recalculates fuel averages for all logs deterministically.
 * It strictly implements the requested rules, sorting first by Odometer reading ascending.
 */
export function recalculateFuelAverages(logs: FuelLog[]): FuelLog[] {
  if (logs.length === 0) return [];

  // Sort logs by Odometer ascending so operations are sequence-safe
  const sortedLogs = [...logs].sort((a, b) => a.currentOdo - b.currentOdo);

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];

    // Reset calculated values to start clean
    log.calculatedAverage = null;
    log.warningFlag = null;

    if (log.isStandaloneAverage) {
      // Standalone Average: simple check and return
      log.calculatedAverage = log.standaloneAverage || null;
      continue;
    }

    if (i === 0 || log.isBrokenChain) {
      // First log or a manually broken chain acts as a baseline (N/A)
      log.calculatedAverage = null;
      continue;
    }

    // Determine calculation based on method
    if (log.trackingMethod === TrackingMethod.PARTIAL_FILL) {
      // Partial Fills do not receive an individual mileage average
      log.calculatedAverage = null;
    } 
    else if (log.trackingMethod === TrackingMethod.RESERVE_TO_RESERVE) {
      // Reserve-to-Reserve Logic: distance covered since previous Reserve-to-Reserve log,
      // divided by the fuel added at that *previous* log.
      let prevReserveLog: FuelLog | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (sortedLogs[j].isBrokenChain) {
          break; // Stop looking past a broken chain
        }
        if (!sortedLogs[j].isStandaloneAverage && sortedLogs[j].trackingMethod === TrackingMethod.RESERVE_TO_RESERVE) {
          prevReserveLog = sortedLogs[j];
          break;
        }
      }

      if (prevReserveLog) {
        const distance = log.currentOdo - prevReserveLog.currentOdo;
        const fuelUsed = prevReserveLog.fuelLiters;
        if (fuelUsed > 0 && distance > 0) {
          const avg = distance / fuelUsed;
          log.calculatedAverage = Number(avg.toFixed(2));
        }
      }
    } 
    else if (log.trackingMethod === TrackingMethod.TANK_TO_TANK) {
      // Tank-to-Tank Cumulative Logic:
      // Sum all fuel liters added since the last "Tank-to-Tank" (or baseline) log,
      // and divide the ODO distance covered in that gap by this sum of fuel.
      let prevAnchorLog: FuelLog | null = null;
      let sumLiters = log.fuelLiters;
      
      for (let j = i - 1; j >= 0; j--) {
        const prev = sortedLogs[j];
        if (prev.isStandaloneAverage) {
          continue; // Skip standalone average entries
        }
        if (prev.isBrokenChain) {
          // The chain is explicitly broken here; treat this as the baseline
          prevAnchorLog = prev;
          break;
        }
        
        // This is part of the cumulative chain. Add its fuel.
        // We accumulate fuel of the intermediate fills.
        if (prev.trackingMethod === TrackingMethod.TANK_TO_TANK) {
          prevAnchorLog = prev;
          break;
        } else {
          sumLiters += prev.fuelLiters;
        }
      }

      // If we found a valid previous anchor log
      if (prevAnchorLog) {
        const distance = log.currentOdo - prevAnchorLog.currentOdo;
        if (distance > 0 && sumLiters > 0) {
          const avg = distance / sumLiters;
          log.calculatedAverage = Number(avg.toFixed(2));
        }
      } else {
        // If there was no previous Tank-to-Tank log, but we have a baseline (index 0)
        const firstLog = sortedLogs[0];
        // Ensure index 0 isn't our current log
        if (firstLog && firstLog.id !== log.id) {
          // Accumulate all fuel from firstLog +1 up to current
          let sumAllFuel = log.fuelLiters;
          for (let j = i - 1; j > 0; j--) {
            if (!sortedLogs[j].isStandaloneAverage) {
              sumAllFuel += sortedLogs[j].fuelLiters;
            }
          }
          const distance = log.currentOdo - firstLog.currentOdo;
          if (distance > 0 && sumAllFuel > 0) {
            const avg = distance / sumAllFuel;
            log.calculatedAverage = Number(avg.toFixed(2));
          }
        }
      }
    }

    // Sanity Threshold Checks
    if (log.calculatedAverage !== null) {
      if (log.calculatedAverage < 10 || log.calculatedAverage > 65) {
        log.warningFlag = "Possible Missed Log?";
      }
    }
  }

  return sortedLogs;
}

/**
 * Calculates current status of maintenance tasks.
 */
export interface MaintenanceStatus {
  chainLubeDueKm: number; // Km left until due
  chainLubeStatus: 'OK' | 'WARNING' | 'DUE';
  chainSlackDueKm: number;
  chainSlackStatus: 'OK' | 'WARNING' | 'DUE';
  engineOilDueKm: number;
  engineOilDueDays: number;
  engineOilStatus: 'OK' | 'WARNING' | 'DUE';
  airFilterDueKm: number;
  airFilterStatus: 'OK' | 'WARNING' | 'DUE';
  
  lastLubeOdo: number | null;
  lastSlackOdo: number | null;
  lastOilDate: string | null;
  lastOilOdo: number | null;
  lastAirFilterOdo: number | null;
}

export function calculateMaintenance(
  currentOdo: number,
  logs: MaintenanceEvent[]
): MaintenanceStatus {
  // Sort descending by ODO and date to get newest easily
  const sorted = [...logs].sort((a, b) => b.odo - a.odo || new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper matching actions in the tasksPerformed array
  const lastLube = sorted.find(l => 
    l.tasksPerformed.includes('Chain Clean & Lube')
  );

  const lastSlack = sorted.find(l => 
    l.tasksPerformed.includes('Chain Slack Adjusted')
  );

  const lastOil = sorted.find(l => 
    l.tasksPerformed.includes('Engine Oil Change')
  );

  const lastAirFilter = sorted.find(l => 
    l.tasksPerformed.includes('Air Filter Clean') ||
    l.tasksPerformed.includes('Air Filter Replaced')
  );

  // 1. Chain Lube: 500 km after last lube
  const lubeOdo = lastLube ? lastLube.odo : 0;
  const lubeDiff = currentOdo - lubeOdo;
  const chainLubeDueKm = Math.max(0, 500 - lubeDiff);
  let chainLubeStatus: 'OK' | 'WARNING' | 'DUE' = 'OK';
  if (chainLubeDueKm === 0) chainLubeStatus = 'DUE';
  else if (chainLubeDueKm <= 100) chainLubeStatus = 'WARNING';

  // 2. Chain Slack: 1500 km after last adjustment
  const slackOdo = lastSlack ? lastSlack.odo : 0;
  const slackDiff = currentOdo - slackOdo;
  const chainSlackDueKm = Math.max(0, 1500 - slackDiff);
  let chainSlackStatus: 'OK' | 'WARNING' | 'DUE' = 'OK';
  if (chainSlackDueKm === 0) chainSlackStatus = 'DUE';
  else if (chainSlackDueKm <= 200) chainSlackStatus = 'WARNING';

  // 3. Engine Oil: 5000 km or 6 months (180 days) after last change
  const oilOdo = lastOil ? lastOil.odo : 0;
  const oilDiff = currentOdo - oilOdo;
  const engineOilDueKm = Math.max(0, 5000 - oilDiff);

  let engineOilDueDays = 180;
  if (lastOil) {
    const elapsedMs = new Date().getTime() - new Date(lastOil.date).getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    engineOilDueDays = Math.max(0, 180 - elapsedDays);
  } else {
    engineOilDueDays = 0; // Immediate alert if no service logged ever
  }

  let engineOilStatus: 'OK' | 'WARNING' | 'DUE' = 'OK';
  if (engineOilDueKm === 0 || engineOilDueDays === 0) {
    engineOilStatus = 'DUE';
  } else if (engineOilDueKm <= 500 || engineOilDueDays <= 15) {
    engineOilStatus = 'WARNING';
  }

  // 4. Air Filter Care: 3000 km after last clean
  const filterOdo = lastAirFilter ? lastAirFilter.odo : 0;
  const filterDiff = currentOdo - filterOdo;
  const airFilterDueKm = Math.max(0, 3000 - filterDiff);
  let airFilterStatus: 'OK' | 'WARNING' | 'DUE' = 'OK';
  if (airFilterDueKm === 0) airFilterStatus = 'DUE';
  else if (airFilterDueKm <= 300) airFilterStatus = 'WARNING';

  return {
    chainLubeDueKm,
    chainLubeStatus,
    chainSlackDueKm,
    chainSlackStatus,
    engineOilDueKm,
    engineOilDueDays,
    engineOilStatus,
    airFilterDueKm,
    airFilterStatus,
    lastLubeOdo: lastLube ? lastLube.odo : null,
    lastSlackOdo: lastSlack ? lastSlack.odo : null,
    lastOilDate: lastOil ? lastOil.date : null,
    lastOilOdo: lastOil ? lastOil.odo : null,
    lastAirFilterOdo: lastAirFilter ? lastAirFilter.odo : null,
  };
}

/**
 * Interface representing alerts for Dashboard notification display.
 */
export interface VaultAlert {
  id: string;
  type: 'DOCUMENT' | 'MAINTENANCE';
  title: string;
  description: string;
  severity: 'URGENT' | 'WARNING' | 'INFO';
  daysLeft?: number;
  kmLeft?: number;
}

/**
 * Compiles all active notifications & alerts across maintenance, chain lube and documents.
 */
export function getActiveAlerts(
  currentOdo: number,
  maintStatus: MaintenanceStatus,
  documents: DocumentRecord[]
): VaultAlert[] {
  const alerts: VaultAlert[] = [];

  // Add maintenance alerts
  if (maintStatus.chainLubeStatus === 'DUE') {
    alerts.push({
      id: 'maint-lube-due',
      type: 'MAINTENANCE',
      title: 'Chain Lubrication past due',
      description: `Lube intervals missed! Current ODO is ${currentOdo} km (Due every 500 km).`,
      severity: 'URGENT',
      kmLeft: 0
    });
  } else if (maintStatus.chainLubeStatus === 'WARNING') {
    alerts.push({
      id: 'maint-lube-warn',
      type: 'MAINTENANCE',
      title: 'Chain Lube recommended soon',
      description: `Only ${maintStatus.chainLubeDueKm} km left before next chain lube cycle.`,
      severity: 'WARNING',
      kmLeft: maintStatus.chainLubeDueKm
    });
  }

  if (maintStatus.chainSlackStatus === 'DUE') {
    alerts.push({
      id: 'maint-slack-due',
      type: 'MAINTENANCE',
      title: 'Check Chain Slack immediately',
      description: `Slack inspection is due! Current ODO is ${currentOdo} km (Due every 1500 km).`,
      severity: 'URGENT',
      kmLeft: 0
    });
  } else if (maintStatus.chainSlackStatus === 'WARNING') {
    alerts.push({
      id: 'maint-slack-warn',
      type: 'MAINTENANCE',
      title: 'Chain Slack inspection due soon',
      description: `${maintStatus.chainSlackDueKm} km remaining before chain slack checkpoint.`,
      severity: 'WARNING',
      kmLeft: maintStatus.chainSlackDueKm
    });
  }

  if (maintStatus.engineOilStatus === 'DUE') {
    const desc = maintStatus.engineOilDueKm === 0 
      ? `Engine oil distance limit exceeded (due every 5000 km).`
      : `Engine oil shelf-life limit hit (due every 6 months/180 days).`;
    alerts.push({
      id: 'maint-oil-due',
      type: 'MAINTENANCE',
      title: 'Engine Oil Change required',
      description: desc,
      severity: 'URGENT',
      kmLeft: maintStatus.engineOilDueKm,
      daysLeft: maintStatus.engineOilDueDays
    });
  } else if (maintStatus.engineOilStatus === 'WARNING') {
    alerts.push({
      id: 'maint-oil-warn',
      type: 'MAINTENANCE',
      title: 'Engine Oil service window open',
      description: `Change recommended in ${maintStatus.engineOilDueKm} km or ${maintStatus.engineOilDueDays} days.`,
      severity: 'WARNING',
      kmLeft: maintStatus.engineOilDueKm,
      daysLeft: maintStatus.engineOilDueDays
    });
  }

  if (maintStatus.airFilterStatus === 'DUE') {
    alerts.push({
      id: 'maint-filter-due',
      type: 'MAINTENANCE',
      title: 'Clean Air Filter now',
      description: `Air filter cleaning cycle overdue (Due every 3000 km).`,
      severity: 'URGENT',
      kmLeft: 0
    });
  } else if (maintStatus.airFilterStatus === 'WARNING') {
    alerts.push({
      id: 'maint-filter-warn',
      type: 'MAINTENANCE',
      title: 'Air Filter maintenance pending',
      description: `Clean air filter in ${maintStatus.airFilterDueKm} km to keep breathing optimal.`,
      severity: 'WARNING',
      kmLeft: maintStatus.airFilterDueKm
    });
  }

  // Document Vault alerts:
  // - 30 days before DL / Insurance expiry
  // - 7 days before PUC expiry
  const now = new Date();
  const todayMidnightStr = now.toISOString().split('T')[0];
  const todayMidnight = new Date(todayMidnightStr + "T00:00:00");
  documents.forEach(doc => {
    if (!doc.expiryDate) return;
    
    const expiryMidnight = new Date(doc.expiryDate + "T00:00:00");
    const msDiff = expiryMidnight.getTime() - todayMidnight.getTime();
    const daysLeft = Math.round(msDiff / (1000 * 60 * 60 * 24));
    const isLicenseOrInsurance = doc.category === DocumentCategory.DL || doc.category === DocumentCategory.INSURANCE;
    const isPuc = doc.category === DocumentCategory.PUC;

    if (daysLeft < 0) {
      alerts.push({
        id: `doc-expired-${doc.id}`,
        type: 'DOCUMENT',
        title: `${doc.category} EXPIRED`,
        description: `Your ${doc.category} expired on ${doc.expiryDate}. Update it immediately!`,
        severity: 'URGENT',
        daysLeft: daysLeft
      });
    } else if (isLicenseOrInsurance && daysLeft <= 30) {
      alerts.push({
        id: `doc-warn-${doc.id}`,
        type: 'DOCUMENT',
        title: `${doc.category} expiring soon`,
        description: `Policy / Card expires on ${doc.expiryDate} (${daysLeft} days remaining).`,
        severity: daysLeft <= 7 ? 'URGENT' : 'WARNING',
        daysLeft: daysLeft
      });
    } else if (isPuc && daysLeft <= 7) {
      alerts.push({
        id: `doc-warn-${doc.id}`,
        type: 'DOCUMENT',
        title: `PUC expires in ${daysLeft} days.`,
        description: `PUC emissions check is due on ${doc.expiryDate} (${daysLeft} days remaining).`,
        severity: 'URGENT',
        daysLeft: daysLeft
      });
    }
  });

  // Sort alerts: URGENT > WARNING > INFO
  const severityWeight = { URGENT: 3, WARNING: 2, INFO: 1 };
  return alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
}

/**
 * Calculates centralized lifetime financials and expense aggregates.
 */
export interface FinancialsStatus {
  fuelCost: number;
  serviceCost: number;
  installedModsCost: number;
  docFees: number;
  miscCost: number;
  totalExpense: number;
  earliestOdo: number;
  latestOdo: number;
  distanceTravelled: number;
  costPerKm: number;
}

export function calculateFinancials(
  currentOdo: number,
  fuelLogs: FuelLog[],
  maintenanceEvents: MaintenanceEvent[],
  garageMods: { status: string; price: number }[],
  documents: { cost?: number }[],
  miscExpenses?: { cost: number; odo?: number }[]
): FinancialsStatus {
  const fuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
  const serviceCost = maintenanceEvents.reduce((sum, log) => sum + (log.totalCost || 0), 0);
  const installedModsCost = garageMods
    .filter(mod => mod.status === 'Installed' || (mod.status as string).toLowerCase() === 'installed')
    .reduce((sum, mod) => sum + (mod.price || 0), 0);
  const docFees = documents.reduce((sum, d) => sum + (d.cost || 0), 0);
  const miscCost = miscExpenses?.reduce((sum, e) => sum + (e.cost || 0), 0) || 0;

  const totalExpense = fuelCost + serviceCost + installedModsCost + docFees + miscCost;

  // Earliest logged ODO (baseline capture)
  const odos = [
    ...fuelLogs.map(l => l.currentOdo),
    ...maintenanceEvents.map(l => l.odo),
    ...(miscExpenses?.map(l => l.odo).filter((o): o is number => o !== undefined) || [])
  ];

  const earliestOdo = odos.length > 0 ? Math.min(...odos) : currentOdo;
  const latestOdo = currentOdo;
  const distanceTravelled = Math.max(0, latestOdo - earliestOdo);

  const costPerKm = distanceTravelled > 0 ? totalExpense / distanceTravelled : 0;

  return {
    fuelCost,
    serviceCost,
    installedModsCost,
    docFees,
    miscCost,
    totalExpense,
    earliestOdo,
    latestOdo,
    distanceTravelled,
    costPerKm
  };
}
