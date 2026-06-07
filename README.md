# MotoVault 🏍️
### The Ultimate Digital Logbook & Companion App for Indian Riders

MotoVault is a premium mobile-first, zero-flicker companion application designed with a **Cosmic Slated Orange** aesthetic. It operates completely offline-first with seamless Google Cloud backup and real-time cross-device synchronization.

This system has been tailored and pre-configured for your **Honda CB350RS**, initializing everything from your live purchase date to set you up perfectly for active, real-world logging.

---

## 🏁 Live Go-Live Baseline Configuration

Your database has been fully primed and loaded with the exact physical metrics of your machine:

- **Motorcycle Make & Model**: Honda CB350RS
- **Active Name/Nickname**: CB350RS
- **Starting Odometer Baseline**: `898` km (Pristine state!)
- **Official Purchase/Delivery Date**: **23rd May 2026**

### 📅 Documentation POV (Indian RTO Compliant)
Since your ownership lifecycle officially started on **May 23rd, 2026**, the **Document Vault** has been pre-configured with correct, high-fidelity Indian regulatory dates calculated exactly from your purchase baseline:
1. **RC (Registration Certificate)**:
   - *Validity*: 15 Years (Standard Indian RTO rule for private petrol two-wheelers).
   - *Expiry Date*: `2041-05-22`
   - *Details*: Associated key details marked for Honda CB350RS core registration.
2. **Insurance Policy**:
   - *Validity*: 1 Year Own-Damage cover renewal cycle.
   - *Expiry Date*: `2027-05-22`
   - *Details*: Initial 1-Yr OD + 5-Yr Third Party package plan.
3. **PUC (Pollution Under Control Certificate)**:
   - *Validity*: 1 Year (Under Central Motor Vehicle Rules, new vehicles in India are exempt from periodic PUC tests for exactly 12 months from purchase).
   - *Expiry Date*: `2027-05-22`
   - *Details*: Pre-entered as a custom Exempt record so you know exactly when to get your first test.
4. **DL (Driving License)**:
   - *Details*: Set with elegant placeholder references, blood group, and emergency contact slots.

---

## ⚡ Key Active Features

1. **🚀 Dashboard Hub**: Real-time stats, dynamic notifications (alerts you of impending PUC/Insurance expirations), active odometer tracker, and overall cost of ownership.
2. **⛽ Fuel Log Engine**: Support for multiple fuel logging methods (Tank-to-Tank, Reserve-to-Reserve, and Partial Fill). Automatically detects outliers and computes high-precision average mileage (km/L).
3. **🔧 Maintenance Log**: Records services, tasks performed (e.g. general service, engine oil change, chain lube), service centers, and total bill values with full upload support.
4. **📂 Document Vault**: High-contrast physical secure category cards. Tracks expiration intervals and alerts you on dashboard. Helps upload and inspect important docs.
5. **⚙️ Modification Garage**: Tracks wishlist items, parts ordered, and already spent installed mods (complete with full installation odometer logging and value computations).
6. **🪙 Finance Expense Ledger**: Consolidates everyday riding costs not covered under fuel or services (riding gear, toll tickets, washing/detailing, parking, or tickets).

---

## 🛠️ Going Live On Your Device: 3-Step Guide

If you'd like to wipe any transient browser history and initialize this baseline on your active device:

1. **Activate Cloud Sync** *(Highly Recommended)*:
   - Click the **Cloud Sync** button in the header bar.
   - Sign in via your Google Account to automatically provision your persistent Firestore cloud database. All logs, receipts, and configurations are synchronized in real-time.
2. **Apply Base Initialization**:
   - In the top header bar, click the **Reset Icon (Circular Revert Arrow)**. This commands MotoVault's sync engine to fetch the specialized pre-loaded Honda CB350RS configuration with your clean `898 km` milage and May 23rd documentation.
3. **Your First Live Logs**:
   - **Log Fuel**: Head to the **Fuel tab** and add your next tank fill-up. Remember to input your current odometer reading (which will be > 898 km) to begin your high-precision mileage tracking loop.
   - **Check wishlist**: Head over to the **Garage tab** to check the pre-loaded *Zana Pillion Top Rack* wishlist item and add any performance, touring, or protection mods you plan to acquire.

---

## 🧬 Tech Stack Under the Hood

- **Frontend Core**: React 18 / TypeScript / Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React (Clean, high-fidelity symbols)
- **Backend Sync**: Firebase Auth (Google OAuth) paired with Google Firestore Enterprise DB.
- **State Engine**: High-performance local-to-cloud reactive hook with full offline durability.
