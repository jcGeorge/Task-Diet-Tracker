export const trackerKeys = [
  "weight",
  "fasting",
  "carbs",
  "workouts",
  "steps",
  "sleep",
  "homework",
  "cleaning",
  "substances"
] as const;

export type TrackerKey = (typeof trackerKeys)[number];
export type ThemeMode = "light" | "dark";
export type MetaListKey = "workouts" | "children" | "chores" | "substances";

export interface BaseTrackerEntry {
  id: string;
  date: string;
}

export interface WeightEntry extends BaseTrackerEntry {
  weightLbs: number;
}

export interface FastingEntry extends BaseTrackerEntry {
  hours: number;
}

export interface CarbsEntry extends BaseTrackerEntry {
  carbs: number;
}

export interface WorkoutActivity {
  metaId: string;
  minutes: number;
}

export interface WorkoutEntry extends BaseTrackerEntry {
  activities: WorkoutActivity[];
}

export interface StepsEntry extends BaseTrackerEntry {
  steps: number;
}

export interface SleepEntry extends BaseTrackerEntry {}

export interface HomeworkEntry extends BaseTrackerEntry {
  childId: string;
  minutes: number;
  notes: string;
}

export interface ChoreEntry extends BaseTrackerEntry {
  choreIds: string[];
  notes: string;
}

export interface SubstanceEntry extends BaseTrackerEntry {
  substanceIds: string[];
  notes: string;
}

export interface MetaItem {
  id: string;
  name: string;
}

export interface MetaLists {
  workouts: MetaItem[];
  children: MetaItem[];
  chores: MetaItem[];
  substances: MetaItem[];
}

export interface TrackerEntryByKey {
  weight: WeightEntry;
  fasting: FastingEntry;
  carbs: CarbsEntry;
  workouts: WorkoutEntry;
  steps: StepsEntry;
  sleep: SleepEntry;
  homework: HomeworkEntry;
  cleaning: ChoreEntry;
  substances: SubstanceEntry;
}

export type TrackerEntry = TrackerEntryByKey[TrackerKey];
export type NewTrackerEntryByKey = { [K in TrackerKey]: Omit<TrackerEntryByKey[K], "id"> };

export interface AppSettings {
  theme: ThemeMode;
  startingWeightLbs: number | null;
  dietStartDate: string | null;
  weightLossPerWeekLbs: number | null;
  weightGoalLbs: number | null;
}

export interface AppData {
  version: 2;
  settings: AppSettings;
  meta: MetaLists;
  trackers: { [K in TrackerKey]: TrackerEntryByKey[K][] };
  updatedAt: string;
}

export const trackerLabels: Record<TrackerKey, string> = {
  weight: "Weight",
  fasting: "Fasting",
  carbs: "Carbs",
  workouts: "Workouts",
  steps: "Steps",
  sleep: "Sleep",
  homework: "Homework",
  cleaning: "Chores",
  substances: "Substances"
};

export const metaLabels: Record<MetaListKey, string> = {
  workouts: "Workouts",
  children: "Children",
  chores: "Chores",
  substances: "Substances"
};
