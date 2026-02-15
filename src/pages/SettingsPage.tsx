import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { displayDateToIso, isDisplayDate, isoToDisplayDate, todayDisplayDate } from "../lib/date";
import { trackerKeys, trackerLabels, type AppData, type TrackerKey } from "../types";

type Notice = { tone: "success" | "danger"; message: string } | null;
type DeleteModalKind = "all" | "before" | null;

const sectionVisibilityOrder: TrackerKey[] = [
  "weight",
  "steps",
  "carbs",
  "calories",
  "workouts",
  "fasting",
  "water",
  "mood",
  "sleep",
  "cleaning",
  "homework",
  "substances",
  "entertainment"
];

function countTrackerEntries(trackers: AppData["trackers"]): number {
  return trackerKeys.reduce((total, key) => total + trackers[key].length, 0);
}

function buildBackupDataBeforeDate(source: AppData, beforeDate: string): AppData {
  const cutoffIsoDate = displayDateToIso(beforeDate);
  if (!cutoffIsoDate) {
    return {
      ...source,
      trackers: {
        weight: [],
        fasting: [],
        water: [],
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

  const trackers: AppData["trackers"] = {
    weight: source.trackers.weight.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    fasting: source.trackers.fasting.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    water: source.trackers.water.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    carbs: source.trackers.carbs.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    calories: source.trackers.calories.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    workouts: source.trackers.workouts.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    steps: source.trackers.steps.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    sleep: source.trackers.sleep.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    mood: source.trackers.mood.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    homework: source.trackers.homework.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    cleaning: source.trackers.cleaning.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    substances: source.trackers.substances.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate),
    entertainment: source.trackers.entertainment.filter((entry) => displayDateToIso(entry.date) < cutoffIsoDate)
  };

  return {
    ...source,
    trackers,
    updatedAt: new Date().toISOString()
  };
}

export function SettingsPage() {
  const {
    data,
    chartDateRangePreferences,
    hiddenSections,
    updateChartDateRangePreferences,
    updateSettings,
    setSectionHidden,
    importFromJson,
    exportToJson,
    exportProvidedData,
    clearAllTrackerEntries,
    clearTrackerEntriesBefore
  } = useAppData();
  const [busyAction, setBusyAction] = useState<
    "import" | "export" | "delete-all" | "delete-before" | "backup-delete-before" | null
  >(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteModalKind, setDeleteModalKind] = useState<DeleteModalKind>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState(todayDisplayDate());
  const todayIso = displayDateToIso(todayDisplayDate());
  const baselineStartIso = data.settings.dietStartDate ? displayDateToIso(data.settings.dietStartDate) : "";
  const userRangeStartDefaultIso = baselineStartIso || todayIso;
  const isDeletePending =
    busyAction === "delete-all" || busyAction === "delete-before" || busyAction === "backup-delete-before";
  const isImportPending = busyAction === "import";

  const handleImportConfirm = async () => {
    setBusyAction("import");
    setNotice(null);
    const imported = await importFromJson();
    setNotice(
      imported
        ? { tone: "success", message: "JSON imported successfully." }
        : { tone: "danger", message: "Import was canceled or failed." }
    );
    setBusyAction(null);
    setIsImportModalOpen(false);
  };

  const handleImportClick = () => {
    setDeleteModalKind(null);
    setIsImportModalOpen(true);
  };

  const handleExport = async () => {
    setBusyAction("export");
    setNotice(null);
    const exported = await exportToJson();
    setNotice(
      exported
        ? { tone: "success", message: "JSON exported successfully." }
        : { tone: "danger", message: "Export was canceled or failed." }
    );
    setBusyAction(null);
  };

  const handleDeleteBeforeClick = () => {
    if (!isDisplayDate(deleteBeforeDate)) {
      setNotice({ tone: "danger", message: "Please choose a valid date for Delete Before." });
      return;
    }
    setDeleteModalKind("before");
  };

  const handleDeleteAllClick = () => {
    setDeleteModalKind("all");
  };

  const handleConfirmDelete = () => {
    if (deleteModalKind === "all") {
      setBusyAction("delete-all");
      const removedCount = clearAllTrackerEntries();
      setNotice({
        tone: "success",
        message:
          removedCount === 0
            ? "No non-meta data entries were found to delete."
            : `Deleted ${removedCount} non-meta data entr${removedCount === 1 ? "y" : "ies"}.`
      });
      setDeleteModalKind(null);
      setBusyAction(null);
      return;
    }

    if (deleteModalKind === "before") {
      if (!isDisplayDate(deleteBeforeDate)) {
        setNotice({ tone: "danger", message: "Please choose a valid date for Delete Before." });
        setDeleteModalKind(null);
        return;
      }

      setBusyAction("delete-before");
      const removedCount = clearTrackerEntriesBefore(deleteBeforeDate);
      setNotice({
        tone: "success",
        message:
          removedCount === 0
            ? `No non-meta data entries were found before ${deleteBeforeDate}.`
            : `Deleted ${removedCount} non-meta data entr${removedCount === 1 ? "y" : "ies"} before ${deleteBeforeDate}.`
      });
      setDeleteModalKind(null);
      setBusyAction(null);
    }
  };

  const handleBackupAndDeleteBefore = async () => {
    if (!isDisplayDate(deleteBeforeDate)) {
      setNotice({ tone: "danger", message: "Please choose a valid date for Delete Before." });
      setDeleteModalKind(null);
      return;
    }

    const backupData = buildBackupDataBeforeDate(data, deleteBeforeDate);
    const backupCount = countTrackerEntries(backupData.trackers);
    if (backupCount === 0) {
      setNotice({ tone: "danger", message: `No non-meta data entries were found before ${deleteBeforeDate}.` });
      setDeleteModalKind(null);
      return;
    }

    setBusyAction("backup-delete-before");
    setNotice(null);

    const exported = await exportProvidedData(backupData);
    if (!exported) {
      setNotice({ tone: "danger", message: "Backup export was canceled or failed. No data was deleted." });
      setBusyAction(null);
      setDeleteModalKind(null);
      return;
    }

    const removedCount = clearTrackerEntriesBefore(deleteBeforeDate);
    setNotice({
      tone: "success",
      message:
        removedCount === 0
          ? `Backup saved, but no non-meta data entries were found before ${deleteBeforeDate}.`
          : `Backup saved and deleted ${removedCount} non-meta data entr${removedCount === 1 ? "y" : "ies"} before ${deleteBeforeDate}.`
    });
    setBusyAction(null);
    setDeleteModalKind(null);
  };

  return (
    <>
      <section className="row g-3 justify-content-center">
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h1 className="h4 mb-3">Settings</h1>

              <div className="mb-4">
                <h2 className="h6 text-uppercase text-secondary">Meta</h2>
                <Link className="btn btn-primary" to="/settings/meta">
                  Open Metadata
                </Link>
              </div>

              <div className="mb-4">
                <h2 className="h6 text-uppercase text-secondary">Theme</h2>
                <div className="btn-group" role="group" aria-label="Theme selector">
                  <button
                    type="button"
                    className={`btn ${data.settings.theme === "light" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => updateSettings({ theme: "light" })}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    className={`btn ${data.settings.theme === "dark" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => updateSettings({ theme: "dark" })}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="h6 text-uppercase text-secondary">Section Visibility</h2>
                <div className="row g-2">
                  {sectionVisibilityOrder.map((trackerKey) => {
                    const isVisible = !hiddenSections.includes(trackerKey);
                    return (
                      <div key={trackerKey} className="col-12 col-sm-6 col-lg-3">
                        <div className="form-check form-switch">
                          <input
                            id={`section-visible-${trackerKey}`}
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={isVisible}
                            onChange={(event) => setSectionHidden(trackerKey, !event.target.checked)}
                          />
                          <label className="form-check-label" htmlFor={`section-visible-${trackerKey}`}>
                            {trackerLabels[trackerKey]}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="form-text mb-0 mt-2">
                  Hidden sections are removed from Home, Tracker/Input dropdowns, and left/right navigation.
                </p>
              </div>

              <div className="mb-4">
                <h2 className="h6 text-uppercase text-secondary">Chart Date Range</h2>
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2 align-items-center">
                    <div className="col-12 col-md-3">
                      <label htmlFor="chart-range-start-mode" className="fw-semibold mb-0">
                        Range Start
                      </label>
                    </div>
                    <div className="col-12 col-md-4">
                      <select
                        id="chart-range-start-mode"
                        className="form-select"
                        value={chartDateRangePreferences.startMode}
                        onChange={(event) =>
                          updateChartDateRangePreferences({
                            startMode: event.target.value === "user" ? "user" : "application",
                            ...(event.target.value === "user" ? { startIso: userRangeStartDefaultIso } : {})
                          })
                        }
                      >
                        <option value="application">Application Decides</option>
                        <option value="user">User Decides</option>
                      </select>
                    </div>
                    {chartDateRangePreferences.startMode === "user" ? (
                      <div className="col-12 col-md-5">
                        <input
                          id="chart-range-start-date"
                          type="date"
                          className="form-control"
                          value={chartDateRangePreferences.startIso}
                          onChange={(event) =>
                            updateChartDateRangePreferences({
                              startIso: event.target.value
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-12 col-md-3">
                      <label htmlFor="chart-range-end-mode" className="fw-semibold mb-0">
                        Range End
                      </label>
                    </div>
                    <div className="col-12 col-md-4">
                      <select
                        id="chart-range-end-mode"
                        className="form-select"
                        value={chartDateRangePreferences.endMode}
                        onChange={(event) =>
                          updateChartDateRangePreferences({
                            endMode: event.target.value === "user" ? "user" : "application",
                            ...(event.target.value === "user" ? { endIso: todayIso } : {})
                          })
                        }
                      >
                        <option value="application">Application Decides</option>
                        <option value="user">User Decides</option>
                      </select>
                    </div>
                    {chartDateRangePreferences.endMode === "user" ? (
                      <div className="col-12 col-md-5">
                        <input
                          id="chart-range-end-date"
                          type="date"
                          className="form-control"
                          value={chartDateRangePreferences.endIso}
                          onChange={(event) =>
                            updateChartDateRangePreferences({
                              endIso: event.target.value
                            })
                          }
                        />
                      </div>
                    ) : null}
                    {chartDateRangePreferences.endMode === "user" ? (
                      <div className="col-12">
                        <p className="form-text mb-0">
                          This date remains static and will not automatically update when tomorrow comes around.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="h6 text-uppercase text-secondary">JSON Data</h2>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-primary" type="button" disabled={!!busyAction} onClick={handleImportClick}>
                    {busyAction === "import" ? "Importing..." : "Import JSON"}
                  </button>
                  <button className="btn btn-outline-primary" type="button" disabled={!!busyAction} onClick={handleExport}>
                    {busyAction === "export" ? "Exporting..." : "Export JSON"}
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <h2 className="h6 text-uppercase text-secondary">Delete Data</h2>
                <div className="d-flex flex-wrap align-items-center gap-2 delete-data-controls">
                  <button className="btn btn-outline-danger" type="button" disabled={!!busyAction} onClick={handleDeleteBeforeClick}>
                    Delete Before
                  </button>
                  <label htmlFor="delete-before-date" className="visually-hidden">
                    Delete before date
                  </label>
                  <input
                    id="delete-before-date"
                    className="form-control delete-date-input"
                    type="date"
                    value={isDisplayDate(deleteBeforeDate) ? displayDateToIso(deleteBeforeDate) : ""}
                    onChange={(event) => setDeleteBeforeDate(isoToDisplayDate(event.target.value))}
                  />
                  <span className="text-secondary">OR</span>
                  <button className="btn btn-danger" type="button" disabled={!!busyAction} onClick={handleDeleteAllClick}>
                    Delete All
                  </button>
                </div>
              </div>

              {notice ? <div className={`alert alert-${notice.tone} mt-3 mb-0`}>{notice.message}</div> : null}
            </div>
          </div>
        </div>
      </section>

      {isImportModalOpen ? (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (!isImportPending && event.target === event.currentTarget) {
                setIsImportModalOpen(false);
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5">Confirm Import</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={isImportPending}
                    onClick={() => setIsImportModalOpen(false)}
                  />
                </div>
                <div className="modal-body">
                  This will replace all your current data, are you sure you want to continue?
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={isImportPending}
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isImportPending}
                    onClick={() => {
                      void handleImportConfirm();
                    }}
                  >
                    {isImportPending ? "Importing..." : "Continue Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}

      {deleteModalKind ? (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (!isDeletePending && event.target === event.currentTarget) {
                setDeleteModalKind(null);
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5">Confirm Deletion</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={isDeletePending}
                    onClick={() => setDeleteModalKind(null)}
                  />
                </div>
                <div className="modal-body">
                  {deleteModalKind === "all"
                    ? "Are you sure you want to delete ALL your non-meta, data entries?"
                    : `Are you sure you want to delete ALL your non-meta, data entries before ${deleteBeforeDate}?`}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={isDeletePending}
                    onClick={() => setDeleteModalKind(null)}
                  >
                    Cancel
                  </button>
                  {deleteModalKind === "before" ? (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={isDeletePending}
                      onClick={() => {
                        void handleBackupAndDeleteBefore();
                      }}
                    >
                      {busyAction === "backup-delete-before" ? "Backing Up..." : "Backup + Delete"}
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-danger" disabled={isDeletePending} onClick={handleConfirmDelete}>
                    {busyAction === "delete-all" || busyAction === "delete-before" ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </>
  );
}
