/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MotoVaultState, TrackingMethod, MaintenanceAction, DocumentCategory, ModCategory, ModStatus, ModPriority, MiscExpenseCategory } from '../types';

export const INITIAL_MOCK_STATE: MotoVaultState = {
  bikeName: 'CB350RS',
  bikeModel: 'Honda CB350RS',
  currentOdo: 898,
  bikePurchasePrice: 0,
  fuelLogs: [],
  maintenanceEvents: [],
  documents: [
    {
      id: 'd-rc',
      category: DocumentCategory.RC,
      docNumber: 'KA-03-RS-0898',
      expiryDate: '2041-05-22', // 15 years registration validity in India (purchased 2026-05-23)
      details: 'Honda CB350RS Official Registration Certificate | Purchased 2026-05-23',
      cost: 0
    },
    {
      id: 'd-ins',
      category: DocumentCategory.INSURANCE,
      docNumber: 'POL-ICICI-RS-0898',
      expiryDate: '2027-05-22', // 1-year own damage renewal date
      details: 'Package Two Wheeler Policy - 1Yr Own Damage + 5Yr Third Party',
      cost: 0
    },
    {
      id: 'd-puc',
      category: DocumentCategory.PUC,
      docNumber: 'EXEMPT-NEW-VEHICLE',
      expiryDate: '2027-05-22', // Indian law exempts new petrol 2-wheelers from PUC verification for 1 year from purchase
      details: 'Exempt for first year of operation since motorcycle launch date',
      cost: 0
    },
    {
      id: 'd-dl',
      category: DocumentCategory.DL,
      docNumber: 'KA-03-2026-0898',
      expiryDate: '2041-12-31',
      details: 'Blood Group: O+ve | Emergency contact backup set',
      cost: 0
    }
  ],
  garageMods: [
    {
      id: 'g-1',
      name: 'Pillion Top Rack & Plate',
      category: ModCategory.TOURING,
      status: ModStatus.WISHLIST,
      priority: ModPriority.HIGH,
      price: 4500,
      source: 'Zana Motorcycles'
    }
  ],
  miscExpenses: []
};
