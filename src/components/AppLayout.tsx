import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
  const pathname = location.pathname;
  const activeTracker = getTrackerFromPath(location.pathname);
  const activeInput = getInputFromPath(location.pathname);
  const isLightTheme = data.settings.theme === "light";
  const isHomeRoute = pathname === "/";
  const isTrackerRoute = pathname.startsWith("/tracker/");
  const isInputRoute = pathname.startsWith("/input/");
  const isSettingsRoute = pathname === "/settings";
  const isMetadataRoute = pathname === "/settings/meta";
  const activeRouteKey = isTrackerRoute ? activeTracker : isInputRoute ? activeInput : "";
  const showRouteStepper = (isTrackerRoute || isInputRoute) && isTrackerKey(activeRouteKey);

  function stepRoute(direction: -1 | 1) {
    if (!showRouteStepper) {
      return;
    }

    const currentIndex = dropdownTrackerKeys.indexOf(activeRouteKey);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + dropdownTrackerKeys.length) % dropdownTrackerKeys.length;
    const nextTrackerKey = dropdownTrackerKeys[nextIndex];
    const basePath = isTrackerRoute ? "/tracker/" : "/input/";
    navigate(`${basePath}${nextTrackerKey}`);
  }

  return (
    <div className="app-shell">
      <header className="app-header sticky-top">
        <nav className="navbar navbar-expand-lg">
          <div className="container-fluid app-toolbar">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary settings-btn header-left-btn"
                type="button"
                aria-label="Theme"
                title="Theme"
                onClick={() => updateSettings({ theme: isLightTheme ? "dark" : "light" })}
              >
                <i className={`bi ${isLightTheme ? "bi-sun-fill" : "bi-moon-fill"}`} aria-hidden="true" />
              </button>

              {showRouteStepper ? (
                <>
                  <button
                    className="btn btn-outline-secondary settings-btn"
                    type="button"
                    aria-label={isTrackerRoute ? "Previous tracker" : "Previous input"}
                    title={isTrackerRoute ? "Previous tracker" : "Previous input"}
                    onClick={() => stepRoute(-1)}
                  >
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                  </button>
                  <button
                    className="btn btn-outline-secondary settings-btn"
                    type="button"
                    aria-label={isTrackerRoute ? "Next tracker" : "Next input"}
                    title={isTrackerRoute ? "Next tracker" : "Next input"}
                    onClick={() => stepRoute(1)}
                  >
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="toolbar-controls">
              <button
                className={`btn btn-outline-secondary settings-btn ${isHomeRoute ? "toolbar-btn-active" : ""}`}
                type="button"
                aria-label="Home"
                title="Home"
                aria-current={isHomeRoute ? "page" : undefined}
                onClick={() => navigate("/")}
              >
                <i className="bi bi-house-fill" aria-hidden="true" />
              </button>

              <label htmlFor="tracker-nav" className="visually-hidden">
                Select tracker
              </label>
              <select
                id="tracker-nav"
                className={`form-select tracker-select ${isTrackerRoute ? "tracker-select-active" : ""}`}
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
                className={`form-select tracker-select ${isInputRoute ? "tracker-select-active" : ""}`}
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
                className={`btn btn-outline-secondary settings-btn ${isMetadataRoute ? "toolbar-btn-active" : ""}`}
                type="button"
                aria-label="Metadata"
                title="Metadata"
                aria-current={isMetadataRoute ? "page" : undefined}
                onClick={() => navigate("/settings/meta")}
              >
                <i className="bi bi-database-fill" aria-hidden="true" />
              </button>

              <button
                className={`btn btn-outline-secondary settings-btn ${isSettingsRoute ? "toolbar-btn-active" : ""}`}
                type="button"
                aria-label="Settings"
                title="Settings"
                aria-current={isSettingsRoute ? "page" : undefined}
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
