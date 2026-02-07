import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CaloriesStackedChart } from "../components/CaloriesStackedChart";
import { ChoresHistogram } from "../components/ChoresHistogram";
import { ThresholdBarChart } from "../components/ThresholdBarChart";
import { SubstancesHistogram } from "../components/SubstancesHistogram";
import { WorkoutsCompositionChart } from "../components/WorkoutsCompositionChart";
import { WeightGraph } from "../components/WeightGraph";
import { useAppData } from "../context/AppDataContext";
import { compareDisplayDatesDesc } from "../lib/date";
import { trackerKeys, trackerLabels, type TrackerKey } from "../types";

function isTrackerKey(value: string): value is TrackerKey {
  return trackerKeys.includes(value as TrackerKey);
}

export function TrackerPage() {
  const { trackerKey } = useParams();
  const { data, removeTrackerEntry } = useAppData();

  if (!trackerKey || !isTrackerKey(trackerKey)) {
    return <Navigate to="/" replace />;
  }

  const entries = useMemo(
    () => [...data.trackers[trackerKey]].sort((left, right) => compareDisplayDatesDesc(left.date, right.date)),
    [data.trackers, trackerKey]
  );

  const workoutNames = useMemo(
    () => Object.fromEntries(data.meta.workouts.map((item) => [item.id, item.name])),
    [data.meta.workouts]
  );
  const subjectNames = useMemo(
    () => Object.fromEntries(data.meta.subjects.map((item) => [item.id, item.name])),
    [data.meta.subjects]
  );
  const childNames = useMemo(
    () => Object.fromEntries(data.meta.children.map((item) => [item.id, item.name])),
    [data.meta.children]
  );
  const choreNames = useMemo(
    () => Object.fromEntries(data.meta.chores.map((item) => [item.id, item.name])),
    [data.meta.chores]
  );
  const substanceNames = useMemo(
    () => Object.fromEntries(data.meta.substances.map((item) => [item.id, item.name])),
    [data.meta.substances]
  );

  return (
    <section className="row g-3">
      {trackerKey === "weight" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Weight Graph</h2>
              <WeightGraph settings={data.settings} entries={data.trackers.weight} />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "substances" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Substances Histogram</h2>
              <SubstancesHistogram entries={data.trackers.substances} substances={data.meta.substances} />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "cleaning" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Chores Chart</h2>
              <ChoresHistogram entries={data.trackers.cleaning} chores={data.meta.chores} />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "steps" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <ThresholdBarChart
                title="Steps Chart"
                entries={data.trackers.steps.map((entry) => ({ id: entry.id, date: entry.date, value: entry.steps }))}
                threshold={data.settings.dailyStepsGoal}
                thresholdLabel="Daily Steps Goal"
                valueLabel="Steps"
                formatWithCommas
              />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "carbs" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <ThresholdBarChart
                title="Carbs Chart"
                entries={data.trackers.carbs.map((entry) => ({ id: entry.id, date: entry.date, value: entry.carbs }))}
                threshold={data.settings.carbLimitPerDay}
                thresholdLabel="Carb Limit Per Day"
                valueLabel="Carbs"
              />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "calories" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <CaloriesStackedChart
                entries={data.trackers.calories.map((entry) => ({
                  id: entry.id,
                  date: entry.date,
                  calories: entry.calories,
                  notes: entry.notes
                }))}
                threshold={data.settings.calorieLimitPerDay}
              />
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "workouts" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <WorkoutsCompositionChart entries={data.trackers.workouts} workouts={data.meta.workouts} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h1 className="h4 mb-0">{trackerLabels[trackerKey]} Tracker</h1>
              <Link className="btn btn-sm btn-outline-secondary" to={`/input/${trackerKey}`}>
                Add Entry
              </Link>
            </div>

            {entries.length === 0 ? (
              <p className="text-secondary mb-0">No entries yet.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {entries.map((entry) => {
                  const item = entry as unknown as Record<string, unknown>;
                  const activities = Array.isArray(item.activities)
                    ? (item.activities as Array<{ metaId: string; minutes: number }>)
                    : [];
                  const choreIds = Array.isArray(item.choreIds) ? (item.choreIds as string[]) : [];
                  const substanceIds = Array.isArray(item.substanceIds) ? (item.substanceIds as string[]) : [];
                  const notes = typeof item.notes === "string" ? item.notes : "";
                  const subjectId = typeof item.subjectId === "string" ? item.subjectId : "";
                  const childId = typeof item.childId === "string" ? item.childId : "";
                  const minutes = typeof item.minutes === "number" ? item.minutes : 0;
                  const weightLbs = typeof item.weightLbs === "number" ? item.weightLbs : 0;
                  const hours = typeof item.hours === "number" ? item.hours : 0;
                  const carbs = typeof item.carbs === "number" ? item.carbs : 0;
                  const calories = typeof item.calories === "number" ? item.calories : 0;
                  const steps = typeof item.steps === "number" ? item.steps : 0;
                  const sleepTime = typeof item.sleepTime === "string" ? item.sleepTime : "";
                  const wakeTime = typeof item.wakeTime === "string" ? item.wakeTime : "";
                  const moodStart = typeof item.moodStart === "number" ? item.moodStart : 0;
                  const moodEnd = typeof item.moodEnd === "number" ? item.moodEnd : 0;

                  const workoutSummary =
                    activities.length > 0
                      ? activities
                          .map(
                            (activity) =>
                              `${(workoutNames[activity.metaId] as string | undefined) ?? "Unknown workout"}: ${activity.minutes} min`
                          )
                          .join(" | ")
                      : "No workout items";

                  const choresSummary =
                    choreIds.map((id) => (choreNames[id] as string | undefined) ?? "Unknown chore").join(", ") || "(none)";

                  const substancesSummary =
                    substanceIds
                      .map((id) => (substanceNames[id] as string | undefined) ?? "Unknown substance")
                      .join(", ") || "(none)";

                  let primarySummary = "";
                  if (trackerKey === "weight") {
                    primarySummary = `Weight (lbs): ${weightLbs}`;
                  } else if (trackerKey === "fasting") {
                    primarySummary = `Hours: ${hours}`;
                  } else if (trackerKey === "carbs") {
                    primarySummary = `Carbs (g): ${carbs}`;
                  } else if (trackerKey === "calories") {
                    primarySummary = `Calories: ${calories}`;
                  } else if (trackerKey === "steps") {
                    primarySummary = `Steps: ${steps}`;
                  } else if (trackerKey === "sleep") {
                    primarySummary = `Sleep: ${sleepTime || "(unset)"} - ${wakeTime || "(unset)"}`;
                  } else if (trackerKey === "mood") {
                    primarySummary = `Mood Start: ${moodStart} | Mood End: ${moodEnd}`;
                  } else if (trackerKey === "workouts") {
                    primarySummary = workoutSummary;
                  } else if (trackerKey === "homework") {
                    primarySummary = `Subject: ${(subjectNames[subjectId] as string | undefined) ?? "Unknown subject"} | Student: ${(childNames[childId] as string | undefined) ?? "Unknown student"} | Minutes: ${minutes}`;
                  } else if (trackerKey === "cleaning") {
                    primarySummary = `Chores: ${choresSummary}`;
                  } else if (trackerKey === "substances") {
                    primarySummary = `Substances: ${substancesSummary}`;
                  }

                  return (
                    <li key={entry.id} className="list-group-item px-3 py-3">
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <div className="fw-semibold mb-0">
                            {entry.date} - {primarySummary}
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger me-2"
                            type="button"
                            onClick={() => removeTrackerEntry(trackerKey, entry.id)}
                          >
                            Remove
                          </button>
                        </div>

                        {(trackerKey === "homework" ||
                          trackerKey === "cleaning" ||
                          trackerKey === "substances" ||
                          trackerKey === "calories" ||
                          trackerKey === "mood") &&
                        notes ? (
                          <div className="small text-secondary">Notes: {notes}</div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
