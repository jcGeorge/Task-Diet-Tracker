import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SharedDateInput } from "../components/SharedDateInput";
import { useAppData } from "../context/AppDataContext";
import { isDisplayDate, todayDisplayDate } from "../lib/date";
import { trackerKeys, trackerLabels, type TrackerKey } from "../types";

function isTrackerKey(value: string): value is TrackerKey {
  return trackerKeys.includes(value as TrackerKey);
}

export function InputPage() {
  const { trackerKey } = useParams();
  const { data, addTrackerEntry } = useAppData();
  const [date, setDate] = useState(todayDisplayDate());
  const [weightLbs, setWeightLbs] = useState("");
  const [fastingHours, setFastingHours] = useState("");
  const [stepsValue, setStepsValue] = useState("");
  const [carbsValue, setCarbsValue] = useState("");
  const [workoutMinutesById, setWorkoutMinutesById] = useState<Record<string, string>>({});
  const [homeworkChildId, setHomeworkChildId] = useState("");
  const [homeworkMinutes, setHomeworkMinutes] = useState("");
  const [homeworkNotes, setHomeworkNotes] = useState("");
  const [selectedChoreIds, setSelectedChoreIds] = useState<string[]>([]);
  const [choreNotes, setChoreNotes] = useState("");
  const [selectedSubstanceIds, setSelectedSubstanceIds] = useState<string[]>([]);
  const [substanceNotes, setSubstanceNotes] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [isToastHovered, setIsToastHovered] = useState(false);
  const [hasToastBeenHovered, setHasToastBeenHovered] = useState(false);

  if (!trackerKey || !isTrackerKey(trackerKey)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!notice) {
      setIsToastHovered(false);
      setHasToastBeenHovered(false);
      return;
    }

    if (isToastHovered) {
      return;
    }

    const timeoutMs = hasToastBeenHovered ? 3000 : 10000;
    const timer = window.setTimeout(() => {
      setNotice(null);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice, isToastHovered, hasToastBeenHovered]);

  function parseNumberInRange(value: string, min: number, max: number): number | null {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < min || parsed > max) {
      return null;
    }
    return parsed;
  }

  function showError(text: string): void {
    setIsToastHovered(false);
    setHasToastBeenHovered(false);
    setNotice({ tone: "danger", message: text });
  }

  function showSuccess(text: string): void {
    setIsToastHovered(false);
    setHasToastBeenHovered(false);
    setNotice({ tone: "success", message: text });
  }

  function toggleIdValue(itemId: string, current: string[], setCurrent: (next: string[]) => void): void {
    if (current.includes(itemId)) {
      setCurrent(current.filter((id) => id !== itemId));
      return;
    }
    setCurrent([...current, itemId]);
  }

  function toggleWorkout(workoutId: string): void {
    setWorkoutMinutesById((previous) => {
      if (previous[workoutId] !== undefined) {
        const next = { ...previous };
        delete next[workoutId];
        return next;
      }
      return { ...previous, [workoutId]: "0" };
    });
  }

  function resetNonDateFields(currentTracker: TrackerKey): void {
    switch (currentTracker) {
      case "weight":
        setWeightLbs("");
        break;
      case "fasting":
        setFastingHours("");
        break;
      case "steps":
        setStepsValue("");
        break;
      case "carbs":
        setCarbsValue("");
        break;
      case "workouts":
        setWorkoutMinutesById({});
        break;
      case "homework":
        setHomeworkChildId("");
        setHomeworkMinutes("");
        setHomeworkNotes("");
        break;
      case "cleaning":
        setSelectedChoreIds([]);
        setChoreNotes("");
        break;
      case "substances":
        setSelectedSubstanceIds([]);
        setSubstanceNotes("");
        break;
      case "sleep":
      default:
        break;
    }
  }

  const handleSubmit = () => {
    if (!isDisplayDate(date)) {
      showError("Please choose a valid date.");
      return;
    }

    if (trackerKey === "weight") {
      const parsed = parseNumberInRange(weightLbs, 0, 3000);
      if (parsed === null) {
        showError("Weight (lbs) must be a number between 0 and 3000.");
        return;
      }
      addTrackerEntry("weight", { date, weightLbs: parsed });
      resetNonDateFields("weight");
      showSuccess(`Weight entry added for ${date}.`);
      return;
    }

    if (trackerKey === "fasting") {
      const parsed = parseNumberInRange(fastingHours, 0, 24);
      if (parsed === null) {
        showError("Hours must be a number between 0 and 24.");
        return;
      }
      addTrackerEntry("fasting", { date, hours: parsed });
      resetNonDateFields("fasting");
      showSuccess(`Fasting entry added for ${date}.`);
      return;
    }

    if (trackerKey === "steps") {
      const parsed = parseNumberInRange(stepsValue, 0, 200000);
      if (parsed === null) {
        showError("Steps must be a number between 0 and 200000.");
        return;
      }
      addTrackerEntry("steps", { date, steps: parsed });
      resetNonDateFields("steps");
      showSuccess(`Steps entry added for ${date}.`);
      return;
    }

    if (trackerKey === "carbs") {
      const parsed = parseNumberInRange(carbsValue, 0, 500);
      if (parsed === null) {
        showError("Carbs must be a number between 0 and 500.");
        return;
      }
      addTrackerEntry("carbs", { date, carbs: parsed });
      resetNonDateFields("carbs");
      showSuccess(`Carbs entry added for ${date}.`);
      return;
    }

    if (trackerKey === "sleep") {
      addTrackerEntry("sleep", { date });
      resetNonDateFields("sleep");
      showSuccess(`Sleep entry added for ${date}.`);
      return;
    }

    if (trackerKey === "workouts") {
      const activities = Object.entries(workoutMinutesById).map(([metaId, minutes]) => ({
        metaId,
        minutes: parseNumberInRange(minutes, 0, 1440)
      }));
      if (activities.length === 0) {
        showError("Select at least one workout.");
        return;
      }
      if (activities.some((activity) => activity.minutes === null)) {
        showError("Each workout minutes value must be a number between 0 and 1440.");
        return;
      }

      addTrackerEntry("workouts", {
        date,
        activities: activities.map((activity) => ({ metaId: activity.metaId, minutes: activity.minutes ?? 0 }))
      });
      resetNonDateFields("workouts");
      showSuccess(`Workout entry added for ${date}.`);
      return;
    }

    if (trackerKey === "homework") {
      const minutes = parseNumberInRange(homeworkMinutes, 0, 1440);
      if (!homeworkChildId) {
        showError("Select a child for homework.");
        return;
      }
      if (minutes === null) {
        showError("Homework minutes must be a number between 0 and 1440.");
        return;
      }

      addTrackerEntry("homework", {
        date,
        childId: homeworkChildId,
        minutes,
        notes: homeworkNotes.trim()
      });
      resetNonDateFields("homework");
      showSuccess(`Homework entry added for ${date}.`);
      return;
    }

    if (trackerKey === "cleaning") {
      if (selectedChoreIds.length === 0) {
        showError("Select at least one chore.");
        return;
      }

      addTrackerEntry("cleaning", {
        date,
        choreIds: selectedChoreIds,
        notes: choreNotes.trim()
      });
      resetNonDateFields("cleaning");
      showSuccess(`Chores entry added for ${date}.`);
      return;
    }

    if (trackerKey === "substances") {
      if (selectedSubstanceIds.length === 0) {
        showError("Select at least one substance.");
        return;
      }

      addTrackerEntry("substances", {
        date,
        substanceIds: selectedSubstanceIds,
        notes: substanceNotes.trim()
      });
      resetNonDateFields("substances");
      showSuccess(`Substances entry added for ${date}.`);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.tagName === "TEXTAREA" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="row g-3 justify-content-center">
      <div className="col-12 col-lg-7 col-xl-6">
        <div className="card border-0 shadow-sm">
          <form className="card-body" onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown}>
            <h1 className="h4 mb-2">{trackerLabels[trackerKey]} Entry</h1>
            <p className="text-secondary mb-3">Inputs are managed separately from tracker views.</p>

            <SharedDateInput id="entry-date" label="Date" value={date} onChange={setDate} required />

            {trackerKey === "weight" ? (
              <div className="mb-3">
                <label htmlFor="weight-lbs" className="form-label fw-semibold">
                  Weight (lbs)
                </label>
                <input
                  id="weight-lbs"
                  type="number"
                  className="form-control shared-date-input"
                  min={0}
                  max={3000}
                  step="any"
                  value={weightLbs}
                  onChange={(event) => setWeightLbs(event.target.value)}
                />
              </div>
            ) : null}

            {trackerKey === "fasting" ? (
              <div className="mb-3">
                <label htmlFor="fasting-hours" className="form-label fw-semibold">
                  Hours
                </label>
                <input
                  id="fasting-hours"
                  type="number"
                  className="form-control shared-date-input"
                  min={0}
                  max={24}
                  step="any"
                  value={fastingHours}
                  onChange={(event) => setFastingHours(event.target.value)}
                />
              </div>
            ) : null}

            {trackerKey === "steps" ? (
              <div className="mb-3">
                <label htmlFor="steps-value" className="form-label fw-semibold">
                  Steps
                </label>
                <input
                  id="steps-value"
                  type="number"
                  className="form-control shared-date-input"
                  min={0}
                  max={200000}
                  step="any"
                  value={stepsValue}
                  onChange={(event) => setStepsValue(event.target.value)}
                />
              </div>
            ) : null}

            {trackerKey === "carbs" ? (
              <div className="mb-3">
                <label htmlFor="carbs-value" className="form-label fw-semibold">
                  Carbs (grams)
                </label>
                <input
                  id="carbs-value"
                  type="number"
                  className="form-control shared-date-input"
                  min={0}
                  max={500}
                  step="any"
                  value={carbsValue}
                  onChange={(event) => setCarbsValue(event.target.value)}
                />
              </div>
            ) : null}

            {trackerKey === "workouts" ? (
              <>
                {data.meta.workouts.length === 0 ? (
                  <div className="alert alert-warning">
                    Add workout names in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Workouts</label>
                    <div className="d-flex flex-column gap-2">
                      {data.meta.workouts.map((item) => {
                        const isSelected = workoutMinutesById[item.id] !== undefined;
                        return (
                          <div key={item.id} className="d-flex gap-2 align-items-center">
                            <button
                              type="button"
                              className={`btn ${isSelected ? "btn-success" : "flag-toggle"}`}
                              onClick={() => toggleWorkout(item.id)}
                            >
                              {item.name}
                            </button>
                            {isSelected ? (
                              <input
                                type="number"
                                className="form-control form-control-sm shared-date-input"
                                min={0}
                                max={1440}
                                step="any"
                                value={workoutMinutesById[item.id]}
                                onChange={(event) =>
                                  setWorkoutMinutesById((previous) => ({ ...previous, [item.id]: event.target.value }))
                                }
                              />
                            ) : null}
                            {isSelected ? <span className="small text-secondary">minutes</span> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {trackerKey === "homework" ? (
              <>
                {data.meta.children.length === 0 ? (
                  <div className="alert alert-warning">
                    Add children in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label htmlFor="homework-child" className="form-label fw-semibold">
                        Child
                      </label>
                      <select
                        id="homework-child"
                        className="form-select shared-date-input"
                        value={homeworkChildId}
                        onChange={(event) => setHomeworkChildId(event.target.value)}
                      >
                        <option value="">Select child</option>
                        {data.meta.children.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="homework-minutes" className="form-label fw-semibold">
                        Minutes
                      </label>
                      <input
                        id="homework-minutes"
                        type="number"
                        className="form-control shared-date-input"
                        min={0}
                        max={1440}
                        step="any"
                        value={homeworkMinutes}
                        onChange={(event) => setHomeworkMinutes(event.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="homework-notes" className="form-label fw-semibold">
                        Notes
                      </label>
                      <textarea
                        id="homework-notes"
                        className="form-control"
                        rows={3}
                        value={homeworkNotes}
                        onChange={(event) => setHomeworkNotes(event.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            ) : null}

            {trackerKey === "cleaning" ? (
              <>
                {data.meta.chores.length === 0 ? (
                  <div className="alert alert-warning">
                    Add chore options in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Chores</label>
                      <div className="d-flex flex-wrap gap-2">
                        {data.meta.chores.map((item) => {
                          const enabled = selectedChoreIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`btn ${enabled ? "btn-success" : "flag-toggle"}`}
                              onClick={() => toggleIdValue(item.id, selectedChoreIds, setSelectedChoreIds)}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="chore-notes" className="form-label fw-semibold">
                        Notes
                      </label>
                      <textarea
                        id="chore-notes"
                        className="form-control"
                        rows={3}
                        value={choreNotes}
                        onChange={(event) => setChoreNotes(event.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            ) : null}

            {trackerKey === "substances" ? (
              <>
                {data.meta.substances.length === 0 ? (
                  <div className="alert alert-warning">
                    Add substance options in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Substances</label>
                      <div className="d-flex flex-wrap gap-2">
                        {data.meta.substances.map((item) => {
                          const enabled = selectedSubstanceIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`btn ${enabled ? "btn-danger" : "flag-toggle"}`}
                              onClick={() => toggleIdValue(item.id, selectedSubstanceIds, setSelectedSubstanceIds)}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="substance-notes" className="form-label fw-semibold">
                        Notes
                      </label>
                      <textarea
                        id="substance-notes"
                        className="form-control"
                        rows={3}
                        value={substanceNotes}
                        onChange={(event) => setSubstanceNotes(event.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            ) : null}

            <hr className="entry-form-divider" />

            <div className="d-flex align-items-center justify-content-between mt-2 input-action-row">
              <Link className="btn btn-outline-secondary input-action-btn" to={`/tracker/${trackerKey}`}>
                View Tracker
              </Link>
              <button className="btn btn-primary input-action-btn" type="submit">
                Create Entry
              </button>
            </div>
          </form>
        </div>
      </div>

      {notice ? (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div
            className={`toast app-toast show align-items-center text-bg-${notice.tone} border-0`}
            role="status"
            aria-live="polite"
            onMouseEnter={() => {
              setIsToastHovered(true);
              setHasToastBeenHovered(true);
            }}
            onMouseLeave={() => {
              setIsToastHovered(false);
            }}
          >
            <div className="d-flex">
              <div className="toast-body">{notice.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white ms-2 me-2 my-auto"
                aria-label="Close"
                onClick={() => setNotice(null)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
