import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { createHash } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

type TrackerKey =
  | "weight"
  | "fasting"
  | "carbs"
  | "calories"
  | "workouts"
  | "steps"
  | "sleep"
  | "mood"
  | "homework"
  | "cleaning"
  | "substances"
  | "entertainment";
type ThemeMode = "light" | "dark";
type MetaListKey = "workouts" | "subjects" | "children" | "chores" | "substances" | "entertainment";

interface BaseTrackerEntry {
  id: string;
  date: string;
}

interface WeightEntry extends BaseTrackerEntry {
  weightLbs: number;
}

interface FastingEntry extends BaseTrackerEntry {
  hours: number;
}

interface CarbsEntry extends BaseTrackerEntry {
  carbs: number;
  notes: string;
}

interface CaloriesEntry extends BaseTrackerEntry {
  calories: number;
  notes: string;
}

interface WorkoutEntry extends BaseTrackerEntry {
  activities: Array<{ metaId: string; minutes: number }>;
}

interface StepsEntry extends BaseTrackerEntry {
  steps: number;
}

interface SleepEntry extends BaseTrackerEntry {
  sleepTime: string;
  wakeTime: string;
}

interface MoodEntry extends BaseTrackerEntry {
  moodStart: number;
  moodEnd: number;
  notes: string;
}

interface HomeworkEntry extends BaseTrackerEntry {
  subjectId: string;
  childId: string;
  minutes: number;
  notes: string;
}

interface ChoreEntry extends BaseTrackerEntry {
  choreIds: string[];
  notes: string;
}

interface SubstanceEntry extends BaseTrackerEntry {
  substanceIds: string[];
  notes: string;
}

interface EntertainmentEntry extends BaseTrackerEntry {
  activities: Array<{ metaId: string; minutes: number }>;
}

interface MetaItem {
  id: string;
  name: string;
}

interface AppSettings {
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

interface AppData {
  version: 2;
  settings: AppSettings;
  meta: {
    workouts: MetaItem[];
    subjects: MetaItem[];
    children: MetaItem[];
    chores: MetaItem[];
    substances: MetaItem[];
    entertainment: MetaItem[];
  };
  trackers: {
    weight: WeightEntry[];
    fasting: FastingEntry[];
    carbs: CarbsEntry[];
    calories: CaloriesEntry[];
    workouts: WorkoutEntry[];
    steps: StepsEntry[];
    sleep: SleepEntry[];
    mood: MoodEntry[];
    homework: HomeworkEntry[];
    cleaning: ChoreEntry[];
    substances: SubstanceEntry[];
    entertainment: EntertainmentEntry[];
  };
  updatedAt: string;
}

const TRACKER_KEYS: TrackerKey[] = [
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
];

const DISPLAY_DATE_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
const DATA_FILE_NAME = "task-weight-data.json";
const LEGACY_DATA_DIR_NAME = "task-weight-aggregator";
const USER_DATA_NAMESPACE = "task-diet-tracker";

let mainWindow: BrowserWindow | null = null;
let dataFilePath: string | null = null;
const defaultUserDataPath = app.getPath("userData");

function getRuntimeIdentity(): string {
  const portableExecutablePath = process.env.PORTABLE_EXECUTABLE_FILE;
  if (portableExecutablePath && portableExecutablePath.trim().length > 0) {
    return portableExecutablePath.trim().toLowerCase();
  }
  return app.getPath("exe").toLowerCase();
}

function configureIsolatedUserDataPath(): void {
  // Isolate Chromium profile/cache by build identity so different app versions can run side-by-side.
  const identity = `${app.getVersion()}|${getRuntimeIdentity()}`;
  const identityHash = createHash("sha1").update(identity).digest("hex").slice(0, 10);
  const isolatedPath = path.join(app.getPath("appData"), USER_DATA_NAMESPACE, `${app.getVersion()}-${identityHash}`);
  app.setPath("userData", isolatedPath);
}

configureIsolatedUserDataPath();

function createDefaultData(): AppData {
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
    meta: {
      workouts: [],
      subjects: [],
      children: [],
      chores: [],
      substances: [],
      entertainment: []
    },
    trackers: {
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
    },
    updatedAt: new Date().toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !DISPLAY_DATE_REGEX.test(value)) {
    return null;
  }
  return value;
}

function parseRangedNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      return parsed;
    }
  }
  return fallback;
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function parseOptionalNonNegativeNumber(value: unknown): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseOptionalRangedNumber(value: unknown, min: number, max: number): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed === null || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function parseText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      unique.add(item.trim());
    }
  }
  return [...unique];
}

function parseBaseEntry(entry: unknown): { id: string; date: string } | null {
  if (!isRecord(entry)) {
    return null;
  }
  const date = parseDate(entry.date);
  if (!date) {
    return null;
  }
  const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : makeId();
  return { id, date };
}

function sanitizeMetaList(value: unknown): MetaItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const byId = new Map<string, MetaItem>();
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = parseText(item.name);
    if (!name) {
      continue;
    }
    const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id : makeId();
    if (!byId.has(id)) {
      byId.set(id, { id, name });
    }
  }
  return [...byId.values()];
}

function getRawEntryList(trackersRaw: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(trackersRaw[key]) ? trackersRaw[key] : [];
}

function sanitizeData(value: unknown): AppData {
  const defaults = createDefaultData();
  if (!isRecord(value)) {
    return defaults;
  }

  const settingsRaw = isRecord(value.settings) ? value.settings : {};
  const metaRaw = isRecord(value.meta) ? value.meta : {};
  const trackersRaw = isRecord(value.trackers) ? value.trackers : {};

  const theme: ThemeMode = settingsRaw.theme === "dark" ? "dark" : "light";
  const startingWeightLbs = parseOptionalNonNegativeNumber(settingsRaw.startingWeightLbs);
  const dietStartDate = parseDate(settingsRaw.dietStartDate);
  const weightLossPerWeekLbs = parseOptionalNonNegativeNumber(settingsRaw.weightLossPerWeekLbs);
  const weightGoalLbs = parseOptionalNonNegativeNumber(settingsRaw.weightGoalLbs);
  const carbLimitPerDay = parseOptionalNonNegativeNumber(settingsRaw.carbLimitPerDay);
  const calorieLimitPerDay = parseOptionalNonNegativeNumber(settingsRaw.calorieLimitPerDay);
  const dailyStepsGoal = parseOptionalNonNegativeNumber(settingsRaw.dailyStepsGoal);
  const desiredSleepHours = parseOptionalRangedNumber(settingsRaw.desiredSleepHours, 3, 12);

  const meta = {
    workouts: sanitizeMetaList(metaRaw.workouts),
    subjects: sanitizeMetaList(metaRaw.subjects),
    children: sanitizeMetaList(metaRaw.children),
    chores: sanitizeMetaList(metaRaw.chores),
    substances: sanitizeMetaList(metaRaw.substances),
    entertainment: sanitizeMetaList(metaRaw.entertainment)
  };

  const weight = getRawEntryList(trackersRaw, "weight")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        weightLbs: parseRangedNumber(entry.weightLbs, 0, 3000, 0)
      } satisfies WeightEntry;
    })
    .filter((entry): entry is WeightEntry => entry !== null);

  const fasting = getRawEntryList(trackersRaw, "fasting")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        hours: parseRangedNumber(entry.hours, 0, 24, 0)
      } satisfies FastingEntry;
    })
    .filter((entry): entry is FastingEntry => entry !== null);

  const carbs = getRawEntryList(trackersRaw, "carbs")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        carbs: parseRangedNumber(entry.carbs, 0, 500, 0),
        notes: parseText(entry.notes)
      } satisfies CarbsEntry;
    })
    .filter((entry): entry is CarbsEntry => entry !== null);

  const calories = getRawEntryList(trackersRaw, "calories")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        calories: parseRangedNumber(entry.calories, 0, 50000, 0),
        notes: parseText(entry.notes)
      } satisfies CaloriesEntry;
    })
    .filter((entry): entry is CaloriesEntry => entry !== null);

  const workouts = getRawEntryList(trackersRaw, "workouts")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }

      const activities = Array.isArray(entry.activities)
        ? entry.activities
            .map((activity) => {
              if (!isRecord(activity)) {
                return null;
              }
              const metaId = parseText(activity.metaId);
              if (!metaId) {
                return null;
              }
              return {
                metaId,
                minutes: parseRangedNumber(activity.minutes, 0, 1440, 0)
              };
            })
            .filter((activity): activity is { metaId: string; minutes: number } => activity !== null)
        : [];

      return {
        ...base,
        activities
      } satisfies WorkoutEntry;
    })
    .filter((entry): entry is WorkoutEntry => entry !== null);

  const steps = getRawEntryList(trackersRaw, "steps")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        steps: parseRangedNumber(entry.steps, 0, 200000, 0)
      } satisfies StepsEntry;
    })
    .filter((entry): entry is StepsEntry => entry !== null);

  const sleep = getRawEntryList(trackersRaw, "sleep")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        sleepTime: parseText(entry.sleepTime),
        wakeTime: parseText(entry.wakeTime)
      } satisfies SleepEntry;
    })
    .filter((entry): entry is SleepEntry => entry !== null);

  const mood = getRawEntryList(trackersRaw, "mood")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        moodStart: parseRangedNumber(entry.moodStart, 0, 10, 0),
        moodEnd: parseRangedNumber(entry.moodEnd, 0, 10, 0),
        notes: parseText(entry.notes)
      } satisfies MoodEntry;
    })
    .filter((entry): entry is MoodEntry => entry !== null);

  const homework = getRawEntryList(trackersRaw, "homework")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        subjectId: parseText(entry.subjectId),
        childId: parseText(entry.childId),
        minutes: parseRangedNumber(entry.minutes, 0, 1440, 0),
        notes: parseText(entry.notes)
      } satisfies HomeworkEntry;
    })
    .filter((entry): entry is HomeworkEntry => entry !== null);

  const cleaning = getRawEntryList(trackersRaw, "cleaning")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        choreIds: parseStringList(entry.choreIds),
        notes: parseText(entry.notes)
      } satisfies ChoreEntry;
    })
    .filter((entry): entry is ChoreEntry => entry !== null);

  const substances = getRawEntryList(trackersRaw, "substances")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }
      return {
        ...base,
        substanceIds: parseStringList(entry.substanceIds),
        notes: parseText(entry.notes)
      } satisfies SubstanceEntry;
    })
    .filter((entry): entry is SubstanceEntry => entry !== null);

  const entertainment = getRawEntryList(trackersRaw, "entertainment")
    .map((entry) => {
      const base = parseBaseEntry(entry);
      if (!base || !isRecord(entry)) {
        return null;
      }

      const activities = Array.isArray(entry.activities)
        ? entry.activities
            .map((activity) => {
              if (!isRecord(activity)) {
                return null;
              }
              const metaId = parseText(activity.metaId);
              if (!metaId) {
                return null;
              }
              return {
                metaId,
                minutes: parseRangedNumber(activity.minutes, 0, 1440, 0)
              };
            })
            .filter((activity): activity is { metaId: string; minutes: number } => activity !== null)
        : [];

      const legacyIds = parseStringList(entry.entertainmentIds);
      const legacyActivities = legacyIds.map((metaId) => ({ metaId, minutes: 0 }));

      return {
        ...base,
        activities: activities.length > 0 ? activities : legacyActivities
      } satisfies EntertainmentEntry;
    })
    .filter((entry): entry is EntertainmentEntry => entry !== null);

  return {
    version: 2,
    settings: {
      theme,
      startingWeightLbs,
      dietStartDate,
      weightLossPerWeekLbs,
      weightGoalLbs,
      carbLimitPerDay,
      calorieLimitPerDay,
      dailyStepsGoal,
      desiredSleepHours
    },
    meta,
    trackers: {
      weight,
      fasting,
      carbs,
      calories,
      workouts,
      steps,
      sleep,
      mood,
      homework,
      cleaning,
      substances,
      entertainment
    },
    updatedAt: new Date().toISOString()
  };
}

async function resolveDataFilePath(): Promise<string> {
  if (dataFilePath) {
    return dataFilePath;
  }

  dataFilePath = path.join(app.getPath("userData"), DATA_FILE_NAME);
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch {
    const migrationCandidates = [
      path.join(defaultUserDataPath, DATA_FILE_NAME),
      path.join(app.getPath("appData"), LEGACY_DATA_DIR_NAME, DATA_FILE_NAME)
    ];

    let migrated = false;
    for (const candidatePath of migrationCandidates) {
      if (path.normalize(candidatePath) === path.normalize(dataFilePath)) {
        continue;
      }

      try {
        const raw = await fs.readFile(candidatePath, "utf8");
        await fs.writeFile(dataFilePath, raw, "utf8");
        migrated = true;
        break;
      } catch {
        // Continue trying migration candidates.
      }
    }

    if (!migrated) {
      await fs.writeFile(dataFilePath, JSON.stringify(createDefaultData(), null, 2), "utf8");
    }
  }

  return dataFilePath;
}

async function readDataFile(): Promise<AppData> {
  const filePath = await resolveDataFilePath();
  const raw = await fs.readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeData(parsed);
    return sanitized;
  } catch {
    const fallback = createDefaultData();
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeDataFile(value: unknown): Promise<AppData> {
  const filePath = await resolveDataFilePath();
  const sanitized = sanitizeData(value);
  await fs.writeFile(filePath, JSON.stringify(sanitized, null, 2), "utf8");
  return sanitized;
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 935,
    minWidth: 800,
    minHeight: 750,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpc(): void {
  ipcMain.handle("app-data:load", async () => {
    return readDataFile();
  });

  ipcMain.handle("app-data:save", async (_event, data: unknown) => {
    return writeDataFile(data);
  });

  ipcMain.handle("app-data:import", async () => {
    if (!mainWindow) {
      return null;
    }

    const choice = await dialog.showOpenDialog(mainWindow, {
      title: "Import Data",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (choice.canceled || choice.filePaths.length === 0) {
      return null;
    }

    try {
      const raw = await fs.readFile(choice.filePaths[0], "utf8");
      const parsed = JSON.parse(raw);
      return writeDataFile(parsed);
    } catch {
      throw new Error("The selected file is not valid JSON data.");
    }
  });

  ipcMain.handle("app-data:export", async (_event, data: unknown) => {
    if (!mainWindow) {
      return false;
    }

    const exportData = data === undefined ? await readDataFile() : sanitizeData(data);
    const savePath = await dialog.showSaveDialog(mainWindow, {
      title: "Export Data",
      defaultPath: path.join(app.getPath("documents"), `task-weight-data-${new Date().toISOString().slice(0, 10)}.json`),
      filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (savePath.canceled || !savePath.filePath) {
      return false;
    }

    await fs.writeFile(savePath.filePath, JSON.stringify(exportData, null, 2), "utf8");
    return true;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
