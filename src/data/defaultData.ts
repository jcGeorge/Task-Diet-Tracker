import { type AppData, type MetaItem, type TrackerEntryByKey, type TrackerKey } from "../types";

function buildEmptyTrackers(): { [K in TrackerKey]: TrackerEntryByKey[K][] } {
  return {
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
    substances: []
  };
}

function buildEmptyMetaItems(): {
  workouts: MetaItem[];
  subjects: MetaItem[];
  children: MetaItem[];
  chores: MetaItem[];
  substances: MetaItem[];
} {
  return {
    workouts: [],
    subjects: [],
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
      weightGoalLbs: null,
      carbLimitPerDay: null,
      calorieLimitPerDay: null,
      dailyStepsGoal: null,
      desiredSleepHours: null
    },
    meta: buildEmptyMetaItems(),
    trackers: buildEmptyTrackers(),
    updatedAt: new Date().toISOString()
  };
}
