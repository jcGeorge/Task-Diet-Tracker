import { type AppData, type MetaItem, type TrackerEntryByKey, type TrackerKey } from "../types";

function buildEmptyTrackers(): { [K in TrackerKey]: TrackerEntryByKey[K][] } {
  return {
    weight: [],
    fasting: [],
    carbs: [],
    workouts: [],
    steps: [],
    sleep: [],
    homework: [],
    cleaning: [],
    substances: []
  };
}

function buildEmptyMetaItems(): { workouts: MetaItem[]; children: MetaItem[]; chores: MetaItem[]; substances: MetaItem[] } {
  return {
    workouts: [],
    children: [],
    chores: [],
    substances: []
  };
}

export function createDefaultData(): AppData {
  return {
    version: 2,
    settings: {
      theme: "light",
      startingWeightLbs: null,
      dietStartDate: null,
      weightLossPerWeekLbs: null,
      weightGoalLbs: null
    },
    meta: buildEmptyMetaItems(),
    trackers: buildEmptyTrackers(),
    updatedAt: new Date().toISOString()
  };
}
