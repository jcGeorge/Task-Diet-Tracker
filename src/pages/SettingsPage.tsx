import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { displayDateToIso, isDisplayDate, isoToDisplayDate, todayDisplayDate } from "../lib/date";

type Notice = { tone: "success" | "danger"; message: string } | null;
type DeleteModalKind = "all" | "before" | null;

export function SettingsPage() {
  const { data, updateSettings, importFromJson, exportToJson, clearAllTrackerEntries, clearTrackerEntriesBefore } =
    useAppData();
  const [busyAction, setBusyAction] = useState<"import" | "export" | "delete-all" | "delete-before" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteModalKind, setDeleteModalKind] = useState<DeleteModalKind>(null);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState(todayDisplayDate());
  const isDeletePending = busyAction === "delete-all" || busyAction === "delete-before";

  const handleImport = async () => {
    setBusyAction("import");
    setNotice(null);
    const imported = await importFromJson();
    setNotice(
      imported
        ? { tone: "success", message: "JSON imported successfully." }
        : { tone: "danger", message: "Import was canceled or failed." }
    );
    setBusyAction(null);
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

  return (
    <>
      <section className="row g-3">
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
                <h2 className="h6 text-uppercase text-secondary">JSON Data</h2>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-primary" type="button" disabled={!!busyAction} onClick={handleImport}>
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
                  <button type="button" className="btn btn-danger" disabled={isDeletePending} onClick={handleConfirmDelete}>
                    {isDeletePending ? "Deleting..." : "Confirm Delete"}
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
