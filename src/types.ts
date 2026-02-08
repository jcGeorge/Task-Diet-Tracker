export const trackerKeys = [
  "weight",
  "fasting",
  "carbs",
  "calories",
  "workouts",
  "steps",
  "sleep",
  "mood",
  "homework",
  "cleaning",
  "substances",
  "entertainment"
] as const;

export type TrackerKey = (typeof trackerKeys)[number];
export type ThemeMode = "light" | "dark";
export type MetaListKey = "workouts" | "subjects" | "children" | "chores" | "substances" | "entertainment";
export type ChartDateRangeMode = "application" | "user";

export interface ChartDateRangePreferences {
  startMode: ChartDateRangeMode;
  startIso: string;
  endMode: ChartDateRangeMode;
  endIso: string;
}

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
  notes: string;
}

export interface CaloriesEntry extends BaseTrackerEntry {
  calories: number;
  notes: string;
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

export interface SleepEntry extends BaseTrackerEntry {
  sleepTime: string;
  wakeTime: string;
}

export interface MoodEntry extends BaseTrackerEntry {
  moodStart: number;
  moodEnd: number;
  notes: string;
}

export interface HomeworkEntry extends BaseTrackerEntry {
  subjectId: string;
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

export interface EntertainmentActivity {
  metaId: string;
  minutes: number;
}

export interface EntertainmentEntry extends BaseTrackerEntry {
  activities: EntertainmentActivity[];
}

export interface MetaItem {
  id: string;
  name: string;
}

export interface MetaLists {
  workouts: MetaItem[];
  subjects: MetaItem[];
  children: MetaItem[];
  chores: MetaItem[];
  substances: MetaItem[];
  entertainment: MetaItem[];
}

export interface TrackerEntryByKey {
  weight: WeightEntry;
  fasting: FastingEntry;
  carbs: CarbsEntry;
  calories: CaloriesEntry;
  workouts: WorkoutEntry;
  steps: StepsEntry;
  sleep: SleepEntry;
  mood: MoodEntry;
  homework: HomeworkEntry;
  cleaning: ChoreEntry;
  substances: SubstanceEntry;
  entertainment: EntertainmentEntry;
}

export type TrackerEntry = TrackerEntryByKey[TrackerKey];
export type NewTrackerEntryByKey = { [K in TrackerKey]: Omit<TrackerEntryByKey[K], "id"> };

export interface AppSettings {
  theme: ThemeMode;
  startingWeightLbs: number | null;
  dietStartDate: string | null;
  weightLossPerWeekLbs: number | null;
  weightGoalLbs: number | null;
  carbLimitPerDay: number | null;
  calorieLimitPerDay: number | null;
  dailyStepsGoal: number | null;
  desiredSleepHours: number | null;
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
  calories: "Calories",
  workouts: "Workouts",
  steps: "Steps",
  sleep: "Sleep",
  mood: "Mood",
  homework: "Homework",
  cleaning: "Chores",
  substances: "Substances",
  entertainment: "Entertainment"
};

export const metaLabels: Record<MetaListKey, string> = {
  workouts: "Workouts",
  subjects: "Subjects",
  children: "Students",
  chores: "Chores",
  substances: "Substances",
  entertainment: "Entertainment"
};
