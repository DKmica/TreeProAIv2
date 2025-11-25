import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/apiService';
import { CrewPendingAction, Job } from '../types';

interface CrewSyncContextValue {
  isOnline: boolean;
  syncing: boolean;
  lastSyncAt?: string;
  pendingActions: CrewPendingAction[];
  jobPatches: Record<string, Partial<Job>>;
  queueJobUpdate: (jobId: string, patch: Partial<Job>, type: CrewPendingAction['type'], description: string) => void;
  clearJobPatch: (jobId: string) => void;
  syncPendingActions: () => Promise<void>;
}

const CrewSyncContext = createContext<CrewSyncContextValue | null>(null);

const STORAGE_KEY = 'crew-offline-state';

interface PersistedState {
  pendingActions: CrewPendingAction[];
  jobPatches: Record<string, Partial<Job>>;
  lastSyncAt?: string;
}

const generateId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random()}`);

export const CrewSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<CrewPendingAction[]>([]);
  const [jobPatches, setJobPatches] = useState<Record<string, Partial<Job>>>({});
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);

  const loadedState = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: PersistedState = JSON.parse(stored);
        setPendingActions(parsed.pendingActions ?? []);
        setJobPatches(parsed.jobPatches ?? {});
        setLastSyncAt(parsed.lastSyncAt);
      } catch (error) {
        console.warn('Failed to parse offline state', error);
      }
    }
    loadedState.current = true;
  }, []);

  useEffect(() => {
    if (!loadedState.current) return;
    const state: PersistedState = { pendingActions, jobPatches, lastSyncAt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [pendingActions, jobPatches, lastSyncAt]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mergePatch = useCallback((jobId: string, patch: Partial<Job>) => {
    setJobPatches((prev) => {
      const existing = prev[jobId] ?? {};
      return {
        ...prev,
        [jobId]: {
          ...existing,
          ...patch,
          photos: patch.photos ?? existing.photos,
          crewNotes: patch.crewNotes ?? existing.crewNotes,
          safetyChecklist: patch.safetyChecklist ?? existing.safetyChecklist,
        },
      };
    });
  }, []);

  const queueJobUpdate = useCallback(
    (jobId: string, patch: Partial<Job>, type: CrewPendingAction['type'], description: string) => {
      const action: CrewPendingAction = {
        id: generateId(),
        jobId,
        type,
        description,
        payload: patch,
        createdAt: new Date().toISOString(),
      };

      mergePatch(jobId, patch);
      setPendingActions((prev) => [...prev, action]);
    },
    [mergePatch]
  );

  const clearJobPatch = useCallback((jobId: string) => {
    setJobPatches((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (syncing || pendingActions.length === 0 || !isOnline) return;

    setSyncing(true);

    try {
      const snapshot = [...pendingActions];

      for (const action of snapshot) {
        await api.jobService.update(action.jobId, action.payload);

        setPendingActions((prev) => {
          const next = prev.filter((item) => item.id !== action.id);
          const stillPendingForJob = next.some((item) => item.jobId === action.jobId);
          if (!stillPendingForJob) {
            clearJobPatch(action.jobId);
          }
          return next;
        });
      }

      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync offline actions', error);
    } finally {
      setSyncing(false);
    }
  }, [clearJobPatch, isOnline, pendingActions, syncing]);

  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions, syncPendingActions]);

  const value: CrewSyncContextValue = useMemo(
    () => ({
      isOnline,
      syncing,
      lastSyncAt,
      pendingActions,
      jobPatches,
      queueJobUpdate,
      clearJobPatch,
      syncPendingActions,
    }),
    [clearJobPatch, isOnline, jobPatches, lastSyncAt, pendingActions, queueJobUpdate, syncPendingActions, syncing]
  );

  return <CrewSyncContext.Provider value={value}>{children}</CrewSyncContext.Provider>;
};

export function useCrewSync(): CrewSyncContextValue {
  const ctx = useContext(CrewSyncContext);
  if (!ctx) throw new Error('useCrewSync must be used within CrewSyncProvider');
  return ctx;
}
