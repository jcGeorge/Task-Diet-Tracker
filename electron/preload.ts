import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("taskTrackerApi", {
  loadData: () => ipcRenderer.invoke("app-data:load"),
  saveData: (data: unknown) => ipcRenderer.invoke("app-data:save", data),
  importData: () => ipcRenderer.invoke("app-data:import"),
  exportData: (data?: unknown) => ipcRenderer.invoke("app-data:export", data)
});

