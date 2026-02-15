'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerOptions {
  path?: string;
  scope?: string;
  onUpdate?: () => void;
  onSuccess?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}) {
  const {
    path = '/sw.js',
    scope = '/',
    onUpdate,
    onSuccess,
    onOffline,
    onOnline,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
  });

  // Register service worker
  const register = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(path, { scope });

      setState((prev) => ({
        ...prev,
        isSupported: true,
        isRegistered: true,
        registration,
      }));

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
              onUpdate?.();
            }
          });
        }
      });

      // Initial registration success
      if (registration.active) {
        onSuccess?.();
      }
    } catch (error) {
    }
  }, [path, scope, onUpdate, onSuccess]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.unregister();
      setState((prev) => ({
        ...prev,
        isRegistered: false,
        registration: null,
      }));
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
    }
  }, [state.registration]);

  // Skip waiting and activate new service worker
  const update = useCallback(() => {
    if (!state.registration?.waiting) return;

    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page to use new service worker
    window.location.reload();
  }, [state.registration]);

  // Clear all caches
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  }, []);

  // Handle online/offline status
  useEffect(() => {
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      onOnline?.();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  // Register on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      register();
    }
  }, [register]);

  // Listen for controller changes
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // New service worker took control
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);

  return {
    ...state,
    register,
    unregister,
    update,
    clearCache,
  };
}

// Hook for offline data syncing
export function useOfflineSync() {
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Add action to sync queue
  const queueAction = useCallback((action: any) => {
    setPendingActions((prev) => [...prev, { ...action, timestamp: Date.now() }]);
    
    // Also store in IndexedDB for persistence
    storeInIndexedDB('pendingActions', action);
  }, []);

  // Sync pending actions
  const sync = useCallback(async () => {
    if (pendingActions.length === 0) return;

    setIsSyncing(true);

    for (const action of pendingActions) {
      try {
        await processAction(action);
        setPendingActions((prev) =>
          prev.filter((a) => a.timestamp !== action.timestamp)
        );
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }

    setIsSyncing(false);
  }, [pendingActions]);

  // Sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      if (pendingActions.length > 0) {
        sync();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [pendingActions, sync]);

  return {
    pendingActions,
    isSyncing,
    queueAction,
    sync,
  };
}

// Helper: Store in IndexedDB
async function storeInIndexedDB(store: string, data: any): Promise<void> {
  // Simplified IndexedDB storage
  // In production, use a library like idb
  try {
    const db = await openDB('oms-offline', 1);
    const tx = db.transaction(store, 'readwrite');
    await tx.objectStore(store).add(data);
  } catch (error) {
    console.error('IndexedDB error:', error);
  }
}

// Helper: Process offline action
async function processAction(action: any): Promise<void> {
  const { type, url, method, body } = action;

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to process action: ${response.statusText}`);
  }
}

// Helper: Open IndexedDB
function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', {
          keyPath: 'timestamp',
        });
      }
    };
  });
}
