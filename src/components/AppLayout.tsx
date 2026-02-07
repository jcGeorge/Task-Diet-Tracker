import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { trackerKeys, trackerLabels, type TrackerKey } from "../types";

function getTrackerFromPath(pathname: string): string {
  if (!pathname.startsWith("/tracker/")) {
    return "";
  }
  return pathname.replace("/tracker/", "");
}

function getInputFromPath(pathname: string): string {
  if (!pathname.startsWith("/input/")) {
    return "";
  }
  return pathname.replace("/input/", "");
}

function isTrackerKey(value: string): value is TrackerKey {
  return trackerKeys.includes(value as TrackerKey);
}

const dropdownTrackerKeys = [...trackerKeys].sort((left, right) =>
  trackerLabels[left].localeCompare(trackerLabels[right])
);

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, clearError, updateSettings } = useAppData();
  const activeTracker = getTrackerFromPath(location.pathname);
  const activeInput = getInputFromPath(location.pathname);
  const isLightTheme = data.settings.theme === "light";

  return (
    <div className="app-shell">
      <header className="app-header sticky-top">
        <nav className="navbar navbar-expand-lg">
          <div className="container-fluid app-toolbar">
            <Link to="/" className="navbar-brand fw-bold brand-link">
              Home
            </Link>

            <div className="toolbar-controls">
              <label htmlFor="tracker-nav" className="visually-hidden">
                Select tracker
              </label>
              <select
                id="tracker-nav"
                className="form-select tracker-select"
                value={isTrackerKey(activeTracker) ? activeTracker : ""}
                onChange={(event) => {
                  if (event.target.value) {
                    navigate(`/tracker/${event.target.value}`);
                  }
                }}
              >
                <option value="">Trackers</option>
                {dropdownTrackerKeys.map((trackerKey) => (
                  <option key={trackerKey} value={trackerKey}>
                    {trackerLabels[trackerKey]}
                  </option>
                ))}
              </select>

              <label htmlFor="input-nav" className="visually-hidden">
                Select input
              </label>
              <select
                id="input-nav"
                className="form-select tracker-select"
                value={isTrackerKey(activeInput) ? activeInput : ""}
                onChange={(event) => {
                  if (event.target.value) {
                    navigate(`/input/${event.target.value}`);
                  }
                }}
              >
                <option value="">Inputs</option>
                {dropdownTrackerKeys.map((trackerKey) => (
                  <option key={trackerKey} value={trackerKey}>
                    {trackerLabels[trackerKey]}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-outline-secondary settings-btn"
                type="button"
                aria-label={`Switch to ${isLightTheme ? "dark" : "light"} mode`}
                onClick={() => updateSettings({ theme: isLightTheme ? "dark" : "light" })}
              >
                <i className={`bi ${isLightTheme ? "bi-sun-fill" : "bi-moon-fill"}`} aria-hidden="true" />
              </button>

              <button
                className="btn btn-outline-secondary settings-btn"
                type="button"
                aria-label="Open settings"
                onClick={() => navigate("/settings")}
              >
                <i className="bi bi-gear-fill" aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="container-fluid app-body">
        {error ? (
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            <div>{error}</div>
            <button type="button" className="btn-close" aria-label="Close" onClick={clearError} />
          </div>
        ) : null}

        {loading ? (
          <div className="card shadow-sm border-0 loading-card">
            <div className="card-body">Loading local data...</div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
