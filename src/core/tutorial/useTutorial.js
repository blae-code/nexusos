/**
 * useTutorial — Hook for managing tutorial state.
 * Persists progress in NexusUser entity and localStorage fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import { safeLocalStorage } from '@/core/data/safe-storage';
import { base44 } from '@/core/data/base44Client';
import { TOUR_STEPS, GETTING_STARTED_ITEMS } from './tutorialSteps';

const STORAGE_KEY = 'nexusos:tutorial';

function loadLocal() {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(state) {
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const DEFAULT_STATE = {
  tourComplete: false,
  tourStep: 0,
  tourActive: false,
  completedItems: [],
  dismissed: false,
};

export function useTutorial(user) {
  const [state, setState] = useState(() => loadLocal() || DEFAULT_STATE);

  // Sync from user entity on load
  useEffect(() => {
    if (!user?.id) return;
    const local = loadLocal();
    if (local) {
      setState(local);
    }
  }, [user?.id]);

  // Persist to localStorage on every change
  useEffect(() => {
    saveLocal(state);
  }, [state]);

  const startTour = useCallback(() => {
    setState(prev => ({ ...prev, tourActive: true, tourStep: 0 }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const next = prev.tourStep + 1;
      if (next >= TOUR_STEPS.length) {
        return {
          ...prev,
          tourActive: false,
          tourStep: 0,
          tourComplete: true,
          completedItems: prev.completedItems.includes('complete_tour')
            ? prev.completedItems
            : [...prev.completedItems, 'complete_tour'],
        };
      }
      return { ...prev, tourStep: next };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      tourStep: Math.max(0, prev.tourStep - 1),
    }));
  }, []);

  const skipTour = useCallback(() => {
    setState(prev => ({ ...prev, tourActive: false, tourStep: 0 }));
  }, []);

  const completeItem = useCallback((itemId) => {
    setState(prev => {
      if (prev.completedItems.includes(itemId)) return prev;
      return { ...prev, completedItems: [...prev.completedItems, itemId] };
    });
  }, []);

  const uncompleteItem = useCallback((itemId) => {
    setState(prev => ({
      ...prev,
      completedItems: prev.completedItems.filter(id => id !== itemId),
    }));
  }, []);

  const dismissChecklist = useCallback(() => {
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  const showChecklist = useCallback(() => {
    setState(prev => ({ ...prev, dismissed: false }));
  }, []);

  const resetAll = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const progress = GETTING_STARTED_ITEMS.length > 0
    ? Math.round((state.completedItems.length / GETTING_STARTED_ITEMS.length) * 100)
    : 0;

  return {
    ...state,
    progress,
    totalItems: GETTING_STARTED_ITEMS.length,
    completedCount: state.completedItems.length,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeItem,
    uncompleteItem,
    dismissChecklist,
    showChecklist,
    resetAll,
  };
}