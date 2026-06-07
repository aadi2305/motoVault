/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  db, 
  auth, 
  isFirebaseConfigured, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { MotoVaultState, FuelLog, MaintenanceEvent, DocumentRecord, ModificationItem, MiscExpense } from '../types';
import { INITIAL_MOCK_STATE } from '../utils/mockData';

const LOCAL_STORAGE_KEY = 'motovault_ride_state_v1';

export function useSyncState(showToast: (msg: string) => void) {
  const [state, setState] = useState<MotoVaultState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // References to keep track of real state to prevent infinite loops / stale closures
  const stateRef = useRef<MotoVaultState | null>(null);
  stateRef.current = state;

  // Load local state initially as fallback
  const loadLocalState = (): MotoVaultState => {
    try {
      const serialized = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        return {
          ...INITIAL_MOCK_STATE,
          ...parsed,
          miscExpenses: parsed.miscExpenses || []
        };
      }
    } catch (e) {
      console.error("Failed loading local storage state", e);
    }
    return INITIAL_MOCK_STATE;
  };

  // Helper to initialize Firestore with current offline/LocalStorage data
  const initializeUserInFirestore = async (userId: string, currentLocal: MotoVaultState) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Root setting doc
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, {
        bikeName: currentLocal.bikeName || 'Neo Scrambler',
        bikeModel: currentLocal.bikeModel || 'Honda CB350RS',
        currentOdo: currentLocal.currentOdo || 0,
        bikePurchasePrice: currentLocal.bikePurchasePrice !== undefined ? currentLocal.bikePurchasePrice : 0
      });

      // 2. Subcollections
      currentLocal.fuelLogs.forEach(item => {
        const ref = doc(db!, 'users', userId, 'fuelLogs', item.id);
        batch.set(ref, item);
      });

      currentLocal.maintenanceEvents.forEach(item => {
        const ref = doc(db!, 'users', userId, 'maintenanceEvents', item.id);
        batch.set(ref, item);
      });

      currentLocal.documents.forEach(item => {
        const ref = doc(db!, 'users', userId, 'documents', item.id);
        batch.set(ref, item);
      });

      currentLocal.garageMods.forEach(item => {
        const ref = doc(db!, 'users', userId, 'garageMods', item.id);
        batch.set(ref, item);
      });

      if (currentLocal.miscExpenses) {
        currentLocal.miscExpenses.forEach(item => {
          const ref = doc(db!, 'users', userId, 'miscExpenses', item.id);
          batch.set(ref, item);
        });
      }

      await batch.commit();
      showToast("Cloud backup completed successfully!");
    } catch (error) {
      console.error("Error initializing Firestore with local logs:", error);
    }
  };

  // Initialize Auth & Real-time Listeners
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      // Local fallbacks
      const localState = loadLocalState();
      setState(localState);
      setLoading(false);
      return;
    }

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        // No user, load from local storage
        const localState = loadLocalState();
        setState(localState);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userId = currentUser.uid;

      // Keep local state pieces in memory before snapshot updates assemble them
      let bikeDetails = {
        bikeName: 'Neo Scrambler',
        bikeModel: 'Honda CB350RS',
        currentOdo: 0,
        bikePurchasePrice: 0
      };
      let fuelLogs: FuelLog[] = [];
      let maintenanceEvents: MaintenanceEvent[] = [];
      let documents: DocumentRecord[] = [];
      let garageMods: ModificationItem[] = [];
      let miscExpenses: MiscExpense[] = [];

      let isInitialUserDocLoad = true;

      // Unsub scribers
      let unsubUser: () => void;
      let unsubFuel: () => void;
      let unsubMaint: () => void;
      let unsubDocs: () => void;
      let unsubMods: () => void;
      let unsubMisc: () => void;

      // Combine and trigger React state update
      const updateCombinedState = () => {
        const assembledState: MotoVaultState = {
          bikeName: bikeDetails.bikeName,
          bikeModel: bikeDetails.bikeModel,
          currentOdo: bikeDetails.currentOdo,
          bikePurchasePrice: bikeDetails.bikePurchasePrice,
          fuelLogs,
          maintenanceEvents,
          documents,
          garageMods,
          miscExpenses
        };
        setState(assembledState);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assembledState));
        setLoading(false);
      };

      // 1. Listen to user profile
      unsubUser = onSnapshot(doc(db!, 'users', userId), async (snap) => {
        if (!snap.exists()) {
          if (isInitialUserDocLoad) {
            isInitialUserDocLoad = false;
            // Initialize with active local state if profile is completely fresh
            const localState = loadLocalState();
            await initializeUserInFirestore(userId, localState);
          }
          return;
        }
        const data = snap.data();
        bikeDetails = {
          bikeName: data.bikeName || 'Neo Scrambler',
          bikeModel: data.bikeModel || 'Honda CB350RS',
          currentOdo: data.currentOdo || 0,
          bikePurchasePrice: data.bikePurchasePrice !== undefined ? data.bikePurchasePrice : 0
        };
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      });

      // 2. Listen to fuelLogs
      unsubFuel = onSnapshot(collection(db!, 'users', userId, 'fuelLogs'), (snap) => {
        const logs: FuelLog[] = [];
        snap.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as FuelLog);
        });
        logs.sort((a, b) => b.currentOdo - a.currentOdo);
        fuelLogs = logs;
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/fuelLogs`);
      });

      // 3. Listen to maintenanceEvents
      unsubMaint = onSnapshot(collection(db!, 'users', userId, 'maintenanceEvents'), (snap) => {
        const logs: MaintenanceEvent[] = [];
        snap.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as MaintenanceEvent);
        });
        logs.sort((a, b) => b.odo - a.odo);
        maintenanceEvents = logs;
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/maintenanceEvents`);
      });

      // 4. Listen to documents
      unsubDocs = onSnapshot(collection(db!, 'users', userId, 'documents'), (snap) => {
        const docsList: DocumentRecord[] = [];
        snap.forEach(docSnap => {
          docsList.push({ id: docSnap.id, ...docSnap.data() } as DocumentRecord);
        });
        documents = docsList;
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/documents`);
      });

      // 5. Listen to garageMods
      unsubMods = onSnapshot(collection(db!, 'users', userId, 'garageMods'), (snap) => {
        const modsList: ModificationItem[] = [];
        snap.forEach(docSnap => {
          modsList.push({ id: docSnap.id, ...docSnap.data() } as ModificationItem);
        });
        garageMods = modsList;
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/garageMods`);
      });

      // 6. Listen to miscExpenses
      unsubMisc = onSnapshot(collection(db!, 'users', userId, 'miscExpenses'), (snap) => {
        const list: MiscExpense[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as MiscExpense);
        });
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        miscExpenses = list;
        updateCombinedState();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/miscExpenses`);
      });

      return () => {
        unsubUser();
        unsubFuel();
        unsubMaint();
        unsubDocs();
        unsubMods();
        unsubMisc();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync / write changes to LocalStorage or Firebase
  const onUpdateState = async (newState: Partial<MotoVaultState>) => {
    const current = stateRef.current || loadLocalState();
    const merged = { ...current, ...newState };

    // Sync state locally immediately so response is lag-free
    setState(merged);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));

    // If logged in, perform differential writes and updates live to Firestore
    if (isFirebaseConfigured && auth?.currentUser && db) {
      const userId = auth.currentUser.uid;
      try {
        // Update user root fields if they changed
        if (
          newState.bikeName !== undefined || 
          newState.bikeModel !== undefined || 
          newState.currentOdo !== undefined ||
          newState.bikePurchasePrice !== undefined
        ) {
          await setDoc(doc(db, 'users', userId), {
            bikeName: merged.bikeName,
            bikeModel: merged.bikeModel,
            currentOdo: merged.currentOdo,
            bikePurchasePrice: merged.bikePurchasePrice !== undefined ? merged.bikePurchasePrice : 0
          }, { merge: true });
        }

        // Differential sync: fuelLogs
        if (newState.fuelLogs !== undefined) {
          const oldMap = new Map<string, FuelLog>(current.fuelLogs.map(l => [l.id, l]));
          const newMap = new Map<string, FuelLog>(newState.fuelLogs.map(l => [l.id, l]));

          for (const item of newState.fuelLogs) {
            const oldItem = oldMap.get(item.id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await setDoc(doc(db, 'users', userId, 'fuelLogs', item.id), item);
            }
          }
          for (const oldId of oldMap.keys()) {
            if (!newMap.has(oldId)) {
              await deleteDoc(doc(db, 'users', userId, 'fuelLogs', oldId));
            }
          }
        }

        // Differential sync: maintenanceEvents
        if (newState.maintenanceEvents !== undefined) {
          const oldMap = new Map<string, MaintenanceEvent>(current.maintenanceEvents.map(l => [l.id, l]));
          const newMap = new Map<string, MaintenanceEvent>(newState.maintenanceEvents.map(l => [l.id, l]));

          for (const item of newState.maintenanceEvents) {
            const oldItem = oldMap.get(item.id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await setDoc(doc(db, 'users', userId, 'maintenanceEvents', item.id), item);
            }
          }
          for (const oldId of oldMap.keys()) {
            if (!newMap.has(oldId)) {
              await deleteDoc(doc(db, 'users', userId, 'maintenanceEvents', oldId));
            }
          }
        }

        // Differential sync: documents
        if (newState.documents !== undefined) {
          const oldMap = new Map<string, DocumentRecord>(current.documents.map(l => [l.id, l]));
          const newMap = new Map<string, DocumentRecord>(newState.documents.map(l => [l.id, l]));

          for (const item of newState.documents) {
            const oldItem = oldMap.get(item.id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await setDoc(doc(db, 'users', userId, 'documents', item.id), item);
            }
          }
          for (const oldId of oldMap.keys()) {
            if (!newMap.has(oldId)) {
              await deleteDoc(doc(db, 'users', userId, 'documents', oldId));
            }
          }
        }

        // Differential sync: garageMods
        if (newState.garageMods !== undefined) {
          const oldMap = new Map<string, ModificationItem>(current.garageMods.map(l => [l.id, l]));
          const newMap = new Map<string, ModificationItem>(newState.garageMods.map(l => [l.id, l]));

          for (const item of newState.garageMods) {
            const oldItem = oldMap.get(item.id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await setDoc(doc(db, 'users', userId, 'garageMods', item.id), item);
            }
          }
          for (const oldId of oldMap.keys()) {
            if (!newMap.has(oldId)) {
              await deleteDoc(doc(db, 'users', userId, 'garageMods', oldId));
            }
          }
        }

        // Differential sync: miscExpenses
        if (newState.miscExpenses !== undefined) {
          const oldMap = new Map<string, MiscExpense>(current.miscExpenses.map(l => [l.id, l]));
          const newMap = new Map<string, MiscExpense>(newState.miscExpenses.map(l => [l.id, l]));

          for (const item of newState.miscExpenses) {
            const oldItem = oldMap.get(item.id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await setDoc(doc(db, 'users', userId, 'miscExpenses', item.id), item);
            }
          }
          for (const oldId of oldMap.keys()) {
            if (!newMap.has(oldId)) {
              await deleteDoc(doc(db, 'users', userId, 'miscExpenses', oldId));
            }
          }
        }

      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
      }
    }
  };

  // Google Sign-in flow
  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      showToast("Firebase isn't configured. Running in Local Mode.");
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Successfully signed in with Google!");
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === 'auth/unauthorized-domain' || String(err).includes('unauthorized-domain')) {
        showToast("Error: Domain unauthorized in Firebase! See pop-up instructions.");
        window.alert(
          "Firebase Auth Error: Domain Not Authorized!\n\n" +
          "To allow Google Login on GitHub Pages:\n" +
          "1. Go to your Google Firebase Console (https://console.firebase.google.com/)\n" +
          "2. Select your MotoVault project\n" +
          "3. Go to: Build -> Authentication\n" +
          "4. Click the 'Settings' tab at the top\n" +
          "5. Select 'Authorized domains' on the left side menu\n" +
          "6. Click 'Add domain'\n" +
          "7. Enter exactly: aadi2305.github.io\n" +
          "8. Click 'Add' and wait 10 seconds. Now try logging in again!\n\n" +
          "Changes take effect immediately."
        );
      } else {
        showToast("Failed to authenticate with Google.");
      }
    }
  };

  // Sign out
  const logout = async () => {
    if (!isFirebaseConfigured || !auth) return;
    try {
      await signOut(auth);
      showToast("Signed out. Switched to Local logs.");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  // Reset current profile to default mock state
  const resetToMock = async () => {
    // Overwrite with initial mock
    setState(INITIAL_MOCK_STATE);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_STATE));

    if (isFirebaseConfigured && auth?.currentUser && db) {
      const userId = auth.currentUser.uid;
      setLoading(true);
      try {
        // Clear all subcollection elements from Firestore first
        await clearAllCollections(userId);
        // Write fresh mock state
        await initializeUserInFirestore(userId, INITIAL_MOCK_STATE);
      } catch (err) {
        console.error("Failed to restore default state:", err);
      } finally {
        setLoading(false);
      }
    }
    showToast("Honda CB350RS sample data restored!");
  };

  // Clear data completely to factory reset
  const clearToEmpty = async (cleanState: MotoVaultState) => {
    setState(cleanState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanState));

    if (isFirebaseConfigured && auth?.currentUser && db) {
      const userId = auth.currentUser.uid;
      setLoading(true);
      try {
        await clearAllCollections(userId);
        await setDoc(doc(db, 'users', userId), {
          bikeName: cleanState.bikeName,
          bikeModel: cleanState.bikeModel,
          currentOdo: cleanState.currentOdo
        });
      } catch (err) {
        console.error("Failed to factory reset user:", err);
      } finally {
        setLoading(false);
      }
    }
    showToast("MotoVault factory reset completed.");
  };

  // Helper to purge all documents in user subcollections
  const clearAllCollections = async (userId: string) => {
    if (!db) return;
    const collectionsToClear = ['fuelLogs', 'maintenanceEvents', 'documents', 'garageMods', 'miscExpenses'];
    for (const collName of collectionsToClear) {
      const querySnap = await getDocs(collection(db, 'users', userId, collName));
      const batch = writeBatch(db);
      querySnap.forEach(snap => {
        batch.delete(doc(db!, 'users', userId, collName, snap.id));
      });
      await batch.commit();
    }
  };

  return {
    state,
    user,
    loading,
    onUpdateState,
    loginWithGoogle,
    logout,
    resetToMock,
    clearToEmpty,
    isFirebaseConfigured
  };
}
