import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { createDefaultData } from "../data/defaultData";
import { displayDateToIso, isDisplayDate } from "../lib/date";
import { getMetaItemUsageCount } from "../lib/metaUsage";
import type {
  AppData,
  AppSettings,
  MetaListKey,
  NewTrackerEntryByKey,
  TrackerEntryByKey,
  TrackerKey
} from "../types";
import { trackerKeys } from "../types";

interface AppDataContextValue {
  data: AppData;
  loading: boolean;
  error: string | null;
  addTrackerEntry: <K extends TrackerKey>(trackerKey: K, entry: NewTrackerEntryByKey[K]) => void;
  removeTrackerEntry: (trackerKey: TrackerKey, entryId: string) => void;
  clearAllTrackerEntries: () => number;
  clearTrackerEntriesBefore: (beforeDate: string) => number;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addMetaItem: (listKey: MetaListKey, name: string) => boolean;
  renameMetaItem: (listKey: MetaListKey, itemId: string, name: string) => boolean;
  removeMetaItem: (listKey: MetaListKey, itemId: string) => { ok: boolean; reason?: string };
  importFromJson: () => Promise<boolean>;
  exportToJson: () => Promise<boolean>;
  exportProvidedData: (exportData: AppData) => Promise<boolean>;
  clearError: () => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function nextId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stamp(data: AppData): AppData {
  return { ...data, updatedAt: new Date().toISOString() };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(createDefaultData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const loaded = await window.taskTrackerApi.loadData();
        if (!ignore) {
          setData(loaded);
        }
      } catch {
        if (!ignore) {
          setError("Could not load the local JSON file.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", data.settings.theme);
  }, [data.settings.theme]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      void window.taskTrackerApi.saveData(data).catch(() => {
        setError("Could not save changes to the local JSON file.");
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, loading]);

  const addTrackerEntry = useCallback(<K extends TrackerKey>(trackerKey: K, entry: NewTrackerEntryByKey[K]) => {
    if (!isDisplayDate(entry.date)) {
      return;
    }

    const nextEntry = { id: nextId(), ...(entry as object) } as TrackerEntryByKey[K];
    setData((previous) =>
      stamp({
        ...previous,
        trackers: {
          ...previous.trackers,
          [trackerKey]: [nextEntry, ...previous.trackers[trackerKey]]
        }
      })
    );
  }, []);

  const removeTrackerEntry = useCallback((trackerKey: TrackerKey, entryId: string) => {
    setData((previous) =>
      stamp({
        ...previous,
        trackers: {
          ...previous.trackers,
          [trackerKey]: previous.trackers[trackerKey].filter((entry) => entry.id !== entryId)
        }
      })
    );
  }, []);

  const clearAllTrackerEntries = useCallback((): number => {
    let removedCount = 0;

    setData((previous) => {
      for (const trackerKey of trackerKeys) {
        removedCount += previous.trackers[trackerKey].length;
      }

      if (removedCount === 0) {
        return previous;
      }

      const nextTrackers: AppData["trackers"] = {
        weight: [],
        fasting: [],
        carbs: [],
        calories: [],
        workouts: [],
        steps: [],
        sleep: [],
        mood: [],
        homework: [],
        cleaning: [],
        substances: [],
        entertainment: []
      };

      return stamp({
        ...previous,
        trackers: nextTrackers
      });
    });

    return removedCount;
  }, []);

  const clearTrackerEntriesBefore = useCallback((beforeDate: string): number => {
    if (!isDisplayDate(beforeDate)) {
      return 0;
    }

    const cutoffIsoDate = displayDateToIso(beforeDate);
    let removedCount = 0;

    setData((previous) => {
      const remainingWeight = previous.trackers.weight.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingFasting = previous.trackers.fasting.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingCarbs = previous.trackers.carbs.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingCalories = previous.trackers.calories.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingWorkouts = previous.trackers.workouts.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingSteps = previous.trackers.steps.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingSleep = previous.trackers.sleep.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingMood = previous.trackers.mood.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingHomework = previous.trackers.homework.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingCleaning = previous.trackers.cleaning.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingSubstances = previous.trackers.substances.filter((entry) => displayDateToIso(entry.date) >= cutoffIsoDate);
      const remainingEntertainment = previous.trackers.entertainment.filter(
        (entry) => displayDateToIso(entry.date) >= cutoffIsoDate
      );

      removedCount += previous.trackers.weight.length - remainingWeight.length;
      removedCount += previous.trackers.fasting.length - remainingFasting.length;
      removedCount += previous.trackers.carbs.length - remainingCarbs.length;
      removedCount += previous.trackers.calories.length - remainingCalories.length;
      removedCount += previous.trackers.workouts.length - remainingWorkouts.length;
      removedCount += previous.trackers.steps.length - remainingSteps.length;
      removedCount += previous.trackers.sleep.length - remainingSleep.length;
      removedCount += previous.trackers.mood.length - remainingMood.length;
      removedCount += previous.trackers.homework.length - remainingHomework.length;
      removedCount += previous.trackers.cleaning.length - remainingCleaning.length;
      removedCount += previous.trackers.substances.length - remainingSubstances.length;
      removedCount += previous.trackers.entertainment.length - remainingEntertainment.length;

      if (removedCount === 0) {
        return previous;
      }

      const nextTrackers: AppData["trackers"] = {
        weight: remainingWeight,
        fasting: remainingFasting,
        carbs: remainingCarbs,
        calories: remainingCalories,
        workouts: remainingWorkouts,
        steps: remainingSteps,
        sleep: remainingSleep,
        mood: remainingMood,
        homework: remainingHomework,
        cleaning: remainingCleaning,
        substances: remainingSubstances,
        entertainment: remainingEntertainment
      };

      return stamp({
        ...previous,
        trackers: nextTrackers
      });
    });

    return removedCount;
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setData((previous) =>
      stamp({
        ...previous,
        settings: {
          ...previous.settings,
          ...settings
        }
      })
    );
  }, []);

  const addMetaItem = useCallback((listKey: MetaListKey, name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }

    let added = false;

    setData((previous) => {
      const alreadyExists = previous.meta[listKey].some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      if (alreadyExists) {
        return previous;
      }

      added = true;
      return stamp({
        ...previous,
        meta: {
          ...previous.meta,
          [listKey]: [...previous.meta[listKey], { id: nextId(), name: trimmed }]
        }
      });
    });

    return added;
  }, []);

  const renameMetaItem = useCallback((listKey: MetaListKey, itemId: string, name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }

    let renamed = false;

    setData((previous) => {
      const hasDuplicate = previous.meta[listKey].some(
        (item) => item.id !== itemId && item.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (hasDuplicate) {
        return previous;
      }

      const nextItems = previous.meta[listKey].map((item) => {
        if (item.id !== itemId || item.name === trimmed) {
          return item;
        }
        renamed = true;
        return { ...item, name: trimmed };
      });

      if (!renamed) {
        return previous;
      }

      return stamp({
        ...previous,
        meta: {
          ...previous.meta,
          [listKey]: nextItems
        }
      });
    });

    return renamed;
  }, []);

  const removeMetaItem = useCallback((listKey: MetaListKey, itemId: string): { ok: boolean; reason?: string } => {
    let removed = false;
    let reason = "";

    setData((previous) => {
      const usageCount = getMetaItemUsageCount(previous, listKey, itemId);
      if (usageCount > 0) {
        reason = "This item is used by existing entries and cannot be deleted.";
        return previous;
      }

      const nextItems = previous.meta[listKey].filter((item) => item.id !== itemId);
      if (nextItems.length === previous.meta[listKey].length) {
        reason = "Item was not found.";
        return previous;
      }

      removed = true;
      return stamp({
        ...previous,
        meta: {
          ...previous.meta,
          [listKey]: nextItems
        }
      });
    });

    if (!removed) {
      return { ok: false, reason: reason || "Item could not be deleted." };
    }
    return { ok: true };
  }, []);

  const importFromJson = useCallback(async (): Promise<boolean> => {
    try {
      const imported = await window.taskTrackerApi.importData();
      if (!imported) {
        return false;
      }
      setData(imported);
      return true;
    } catch {
      setError("Import failed. Make sure the selected file is valid JSON.");
      return false;
    }
  }, []);

  const exportToJson = useCallback(async (): Promise<boolean> => {
    try {
      return await window.taskTrackerApi.exportData(data);
    } catch {
      setError("Export failed.");
      return false;
    }
  }, [data]);

  const exportProvidedData = useCallback(async (exportData: AppData): Promise<boolean> => {
    try {
      return await window.taskTrackerApi.exportData(exportData);
    } catch {
      setError("Export failed.");
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      loading,
      error,
      addTrackerEntry,
      removeTrackerEntry,
      clearAllTrackerEntries,
      clearTrackerEntriesBefore,
      updateSettings,
      addMetaItem,
      renameMetaItem,
      removeMetaItem,
      importFromJson,
      exportToJson,
      exportProvidedData,
      clearError
    }),
    [
      data,
      loading,
      error,
      addTrackerEntry,
      removeTrackerEntry,
      clearAllTrackerEntries,
      clearTrackerEntriesBefore,
      updateSettings,
      addMetaItem,
      renameMetaItem,
      removeMetaItem,
      importFromJson,
      exportToJson,
      exportProvidedData,
      clearError
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }
  return context;
}
