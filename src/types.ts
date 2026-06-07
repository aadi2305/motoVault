/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TrackingMethod {
  TANK_TO_TANK = 'Tank-to-Tank',
  RESERVE_TO_RESERVE = 'Reserve-to-Reserve',
  PARTIAL_FILL = 'Partial Fill'
}

export enum MaintenanceAction {
  LUBE_ONLY = 'Lube Chain',
  CLEAN_LUBE_CHAIN = 'Clean & Lube Chain',
  ADJUST_CHAIN_SLACK = 'Adjust Chain Slack',
  ENGINE_OIL_CHANGE = 'Engine Oil Change',
  AIR_FILTER_SERVICE = 'Air Filter Service',
  GENERAL_SERVICE = 'General Service'
}

export enum DocumentCategory {
  RC = 'RC (Registration Certificate)',
  DL = 'DL (Driving License)',
  INSURANCE = 'Insurance Policy',
  PUC = 'PUC (Pollution Certificate)',
  EMERGENCY = 'Emergency & Medical Info'
}

export enum ModCategory {
  TOURING = 'Touring',
  PROTECTION = 'Protection',
  ELECTRICALS = 'Electricals',
  PERFORMANCE = 'Performance',
  COSMETICS = 'Cosmetics'
}

export enum ModStatus {
  WISHLIST = 'Wishlist',
  ORDERED = 'Ordered',
  INSTALLED = 'Installed'
}

export enum ModPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum MiscExpenseCategory {
  GEAR = 'Gear',
  PARKING_FINES = 'Parking/Fines',
  WASHING_DETAILING = 'Washing/Detailing',
  TOLLS = 'Tolls',
  OTHERS = 'Others'
}

export interface MiscExpense {
  id: string;
  date: string; // YYYY-MM-DD
  odo?: number | null; // Optional
  itemReason: string;
  category: MiscExpenseCategory;
  cost: number; // ₹
  notes?: string;
}

export interface FuelLog {
  id: string;
  date: string; // YYYY-MM-DD
  currentOdo: number;
  tripA?: number; // optional
  fuelLiters: number;
  totalCost: number; // ₹
  fuelStation: string;
  trackingMethod: TrackingMethod;
  isStandaloneAverage: boolean;
  standaloneAverage?: number; // km/L (if standsalone)
  
  // Computed fields
  calculatedAverage: number | null; // km/L, or null (N/A)
  warningFlag: string | null; // e.g., "Possible Missed Log?"
  isBrokenChain: boolean; // if true, starts a fresh baseline calculation
}

export interface MaintenanceEvent {
  id: string;
  date: string; // YYYY-MM-DD
  odo: number;
  serviceCenter: string; // 'Honda ASC', 'Local Mechanic', 'Self', or text
  totalCost: number; // ₹
  billPhotoUrl?: string; // Bill/Invoice Photo Upload Base64 representation
  notes: string;
  tasksPerformed: string[]; // Options: Engine Oil Change, Oil Filter Change, etc.
}

export interface DocumentRecord {
  id: string;
  category: DocumentCategory;
  docNumber: string;
  expiryDate?: string; // YYYY-MM-DD
  details?: string; // E.g. blood group or contact name
  photoDataUrl?: string; // Base64 image
  fileName?: string;
  cost?: number; // ₹ (Document Fee or Premium cost)
}

export interface ModificationItem {
  id: string;
  name: string;
  category: ModCategory;
  status: ModStatus;
  priority: ModPriority;
  price: number; // ₹
  source: string; // Shop or URL
  installationOdo?: number | null;
}

export interface MotoVaultState {
  bikeName: string;
  bikeModel: string;
  currentOdo: number;
  fuelLogs: FuelLog[];
  maintenanceEvents: MaintenanceEvent[];
  documents: DocumentRecord[];
  garageMods: ModificationItem[];
  miscExpenses: MiscExpense[];
}
