import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { trackerKeys, trackerLabels } from "../types";

export function HomePage() {
  const { data } = useAppData();

  return (
    <section>
      <div className="card border-0 shadow-sm mb-3 hero-card">
        <div className="card-body">
          <h1 className="h3 mb-2">Task / Diet Hub</h1>
          <p className="mb-0 text-secondary">Track daily progress across health and productivity categories.</p>
        </div>
      </div>

      <h2 className="h5 mb-3">Trackers</h2>
      <div className="row g-3 mb-4">
        {trackerKeys.map((trackerKey) => (
          <div key={trackerKey} className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm h-100 tracker-card">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">{trackerLabels[trackerKey]}</h2>
                  <span className="text-secondary fs-6">Entries: {data.trackers[trackerKey].length}</span>
                </div>
                <Link className="btn btn-primary mt-auto" to={`/tracker/${trackerKey}`}>
                  Open Tracker
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h5 mb-3">Inputs</h2>
      <div className="row g-3">
        {trackerKeys.map((trackerKey) => (
          <div key={`input-${trackerKey}`} className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm h-100 tracker-card">
              <div className="card-body d-flex flex-column">
                <h2 className="h5 mb-3">{trackerLabels[trackerKey]}</h2>
                <Link className="btn btn-success mt-auto" to={`/input/${trackerKey}`}>
                  Open Input
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
