import type { AppData } from "./types";

interface TaskTrackerApi {
  loadData: () => Promise<AppData>;
  saveData: (data: AppData) => Promise<AppData>;
  importData: () => Promise<AppData | null>;
  exportData: (data?: AppData) => Promise<boolean>;
}

declare global {
  interface Window {
    taskTrackerApi: TaskTrackerApi;
  }
}

export {};

