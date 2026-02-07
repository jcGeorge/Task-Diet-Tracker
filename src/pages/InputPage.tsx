import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CaloriesByDateList } from "../components/CaloriesByDateList";
import { SharedDateInput } from "../components/SharedDateInput";
import { TimeSelector } from "../components/TimeSelector";
import { useAppData } from "../context/AppDataContext";
import { isDisplayDate, todayDisplayDate } from "../lib/date";
import { formatTimeParts, type TimeParts } from "../lib/time";
import { trackerKeys, trackerLabels, type TrackerKey } from "../types";

function isTrackerKey(value: string): value is TrackerKey {
  return trackerKeys.includes(value as TrackerKey);
}

const DEFAULT_WAKE_TIME_PARTS: TimeParts = {
  hour: "",
  minute: "",
  meridiem: "AM"
};

const DEFAULT_SLEEP_TIME_PARTS: TimeParts = {
  hour: "",
  minute: "",
  meridiem: "PM"
};

export function InputPage() {
  const { trackerKey } = useParams();
  const { data, addTrackerEntry } = useAppData();
  const [date, setDate] = useState(todayDisplayDate());
  const [weightLbs, setWeightLbs] = useState("");
  const [fastingHours, setFastingHours] = useState("");
  const [stepsValue, setStepsValue] = useState("");
  const [carbsValue, setCarbsValue] = useState("");
  const [caloriesValue, setCaloriesValue] = useState("");
  const [caloriesNotes, setCaloriesNotes] = useState("");
  const [sleepTime, setSleepTime] = useState<TimeParts>(DEFAULT_SLEEP_TIME_PARTS);
  const [wakeTime, setWakeTime] = useState<TimeParts>(DEFAULT_WAKE_TIME_PARTS);
  const [moodStart, setMoodStart] = useState("");
  const [moodEnd, setMoodEnd] = useState("");
  const [moodNotes, setMoodNotes] = useState("");
  const [workoutMinutesById, setWorkoutMinutesById] = useState<Record<string, string>>({});
  const [homeworkSubjectId, setHomeworkSubjectId] = useState("");
  const [homeworkChildId, setHomeworkChildId] = useState("");
  const [homeworkMinutes, setHomeworkMinutes] = useState("");
  const [homeworkNotes, setHomeworkNotes] = useState("");
  const [selectedChoreIds, setSelectedChoreIds] = useState<string[]>([]);
  const [choreNotes, setChoreNotes] = useState("");
  const [selectedSubstanceIds, setSelectedSubstanceIds] = useState<string[]>([]);
  const [entertainmentMinutesById, setEntertainmentMinutesById] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [isToastHovered, setIsToastHovered] = useState(false);
  const [hasToastBeenHovered, setHasToastBeenHovered] = useState(false);
  const entertainmentLabelWidthCh = useMemo(() => {
    const maxLength = data.meta.entertainment.reduce((max, item) => Math.max(max, item.name.length), 0);
    return Math.min(Math.max(maxLength + 4, 14), 30);
  }, [data.meta.entertainment]);
  const entertainmentWidthStyle = useMemo<CSSProperties>(
    () => ({
      ["--entertainment-label-width" as string]: `${entertainmentLabelWidthCh}ch`
    }),
    [entertainmentLabelWidthCh]
  );

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

  function parseOptionalMinutesInRange(value: string, min: number, max: number): number | null {
    if (value.trim() === "") {
      return 0;
    }
    return parseNumberInRange(value, min, max);
  }

  function normalizeNumberText(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(2).replace(/\.?0+$/, "");
  }

  function stepMinuteValue(raw: string, delta: 5 | -5): string {
    const parsed = Number.parseFloat(raw.trim());
    if (!Number.isFinite(parsed)) {
      return delta > 0 ? "5" : "0";
    }

    if (delta > 0) {
      if (parsed < 0) {
        return "5";
      }
      return normalizeNumberText(parsed + 5);
    }

    return normalizeNumberText(Math.max(0, parsed - 5));
  }

  function nudgeWorkoutMinutes(workoutId: string, delta: 5 | -5): void {
    setWorkoutMinutesById((previous) => ({
      ...previous,
      [workoutId]: stepMinuteValue(previous[workoutId] ?? "", delta)
    }));
  }

  function nudgeHomeworkMinutes(delta: 5 | -5): void {
    setHomeworkMinutes((previous) => stepMinuteValue(previous, delta));
  }

  function nudgeEntertainmentMinutes(itemId: string, delta: 5 | -5): void {
    setEntertainmentMinutesById((previous) => ({
      ...previous,
      [itemId]: stepMinuteValue(previous[itemId] ?? "", delta)
    }));
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
      case "calories":
        setCaloriesValue("");
        setCaloriesNotes("");
        break;
      case "sleep":
        setSleepTime(DEFAULT_SLEEP_TIME_PARTS);
        setWakeTime(DEFAULT_WAKE_TIME_PARTS);
        break;
      case "mood":
        setMoodStart("");
        setMoodEnd("");
        setMoodNotes("");
        break;
      case "workouts":
        setWorkoutMinutesById({});
        break;
      case "homework":
        setHomeworkSubjectId("");
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
        break;
      case "entertainment":
        setEntertainmentMinutesById({});
        break;
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

    if (trackerKey === "calories") {
      const parsed = parseNumberInRange(caloriesValue, 0, 50000);
      if (parsed === null) {
        showError("Calories must be a number between 0 and 50000.");
        return;
      }
      addTrackerEntry("calories", { date, calories: parsed, notes: caloriesNotes.trim() });
      resetNonDateFields("calories");
      showSuccess(`Calories entry added for ${date}.`);
      return;
    }

    if (trackerKey === "sleep") {
      const nextSleepTime = formatTimeParts(sleepTime);
      const nextWakeTime = formatTimeParts(wakeTime);
      if (!nextSleepTime || !nextWakeTime) {
        showError("Sleep and wake times are required.");
        return;
      }
      addTrackerEntry("sleep", { date, sleepTime: nextSleepTime, wakeTime: nextWakeTime });
      resetNonDateFields("sleep");
      showSuccess(`Sleep entry added for ${date}.`);
      return;
    }

    if (trackerKey === "mood") {
      const parsedMoodStart = parseNumberInRange(moodStart, 0, 10);
      const parsedMoodEnd = parseNumberInRange(moodEnd, 0, 10);
      if (parsedMoodStart === null || parsedMoodEnd === null) {
        showError("Mood Start and Mood End must be numbers between 0 and 10.");
        return;
      }
      addTrackerEntry("mood", {
        date,
        moodStart: parsedMoodStart,
        moodEnd: parsedMoodEnd,
        notes: moodNotes.trim()
      });
      resetNonDateFields("mood");
      showSuccess(`Mood entry added for ${date}.`);
      return;
    }

    if (trackerKey === "workouts") {
      const activities = Object.entries(workoutMinutesById).map(([metaId, minutes]) => ({
        metaId,
        minutes: parseOptionalMinutesInRange(minutes, 0, 1440)
      }));
      if (activities.length === 0) {
        showError("Select at least one workout.");
        return;
      }
      if (activities.some((activity) => activity.minutes === null)) {
        showError("Each workout minutes value must be a number between 0 and 1440.");
        return;
      }

      const nonZeroActivities = activities.filter((activity) => (activity.minutes ?? 0) > 0);
      if (nonZeroActivities.length === 0) {
        showError("Enter at least one workout with minutes greater than 0.");
        return;
      }

      addTrackerEntry("workouts", {
        date,
        activities: nonZeroActivities.map((activity) => ({ metaId: activity.metaId, minutes: activity.minutes ?? 0 }))
      });
      resetNonDateFields("workouts");
      showSuccess(`Workout entry added for ${date}.`);
      return;
    }

    if (trackerKey === "homework") {
      const minutes = parseNumberInRange(homeworkMinutes, 0, 1440);
      if (!homeworkSubjectId) {
        showError("Select a subject for homework.");
        return;
      }
      if (!homeworkChildId) {
        showError("Select a student for homework.");
        return;
      }
      if (minutes === null) {
        showError("Homework minutes must be a number between 0 and 1440.");
        return;
      }

      addTrackerEntry("homework", {
        date,
        subjectId: homeworkSubjectId,
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
        notes: ""
      });
      resetNonDateFields("substances");
      showSuccess(`Substances entry added for ${date}.`);
      return;
    }

    if (trackerKey === "entertainment") {
      const activities = Object.entries(entertainmentMinutesById).map(([metaId, minutes]) => ({
        metaId,
        minutes: parseOptionalMinutesInRange(minutes, 0, 1440)
      }));
      if (activities.length === 0) {
        showError("Select at least one entertainment item.");
        return;
      }
      if (activities.some((activity) => activity.minutes === null)) {
        showError("Each entertainment minutes value must be a number between 0 and 1440.");
        return;
      }

      const nonZeroActivities = activities.filter((activity) => (activity.minutes ?? 0) > 0);
      if (nonZeroActivities.length === 0) {
        showError("Enter at least one entertainment item with minutes greater than 0.");
        return;
      }

      addTrackerEntry("entertainment", {
        date,
        activities: nonZeroActivities.map((activity) => ({ metaId: activity.metaId, minutes: activity.minutes ?? 0 }))
      });
      resetNonDateFields("entertainment");
      showSuccess(`Entertainment entry added for ${date}.`);
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

            <SharedDateInput id="entry-date" label="Date" value={date} onChange={setDate} required allowDayStepper />

            {trackerKey === "calories" ? <CaloriesByDateList date={date} entries={data.trackers.calories} /> : null}

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

            {trackerKey === "calories" ? (
              <>
                <div className="mb-3">
                  <label htmlFor="calories-value" className="form-label fw-semibold">
                    Calories
                  </label>
                  <input
                    id="calories-value"
                    type="number"
                    className="form-control shared-date-input"
                    min={0}
                    max={50000}
                    step="any"
                    value={caloriesValue}
                    onChange={(event) => setCaloriesValue(event.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="calories-notes" className="form-label fw-semibold">
                    Notes
                  </label>
                  <textarea
                    id="calories-notes"
                    className="form-control"
                    rows={3}
                    value={caloriesNotes}
                    onChange={(event) => setCaloriesNotes(event.target.value)}
                  />
                </div>
              </>
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
                          <div key={item.id} className="workout-minute-row">
                            <button
                              type="button"
                              className={`btn workout-toggle-btn ${isSelected ? "btn-success" : "flag-toggle"}`}
                              onClick={() => toggleWorkout(item.id)}
                            >
                              {item.name}
                            </button>
                            {isSelected ? (
                              <div className="d-flex align-items-center gap-2 workout-minute-controls minutes-control-row">
                                <input
                                  type="number"
                                  className="form-control shared-date-input minutes-selector-input"
                                  min={0}
                                  max={1440}
                                  step="any"
                                  value={workoutMinutesById[item.id]}
                                  onChange={(event) =>
                                    setWorkoutMinutesById((previous) => ({ ...previous, [item.id]: event.target.value }))
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm minutes-step-btn"
                                  aria-label={`Subtract 5 minutes from ${item.name}`}
                                  onClick={() => nudgeWorkoutMinutes(item.id, -5)}
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm minutes-step-btn"
                                  aria-label={`Add 5 minutes to ${item.name}`}
                                  onClick={() => nudgeWorkoutMinutes(item.id, 5)}
                                >
                                  +
                                </button>
                                <span className="text-secondary mb-0 minutes-unit-label">minutes</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {trackerKey === "sleep" ? (
              <>
                <TimeSelector
                  idPrefix="sleep-time"
                  label="Time of Sleep"
                  value={sleepTime}
                  onChange={setSleepTime}
                />
                <TimeSelector idPrefix="wake-time" label="Wake Up Time" value={wakeTime} onChange={setWakeTime} />
              </>
            ) : null}

            {trackerKey === "mood" ? (
              <>
                <div className="mb-3">
                  <label htmlFor="mood-start" className="form-label fw-semibold">
                    Mood Start
                  </label>
                  <input
                    id="mood-start"
                    type="number"
                    className="form-control shared-date-input"
                    min={0}
                    max={10}
                    step="any"
                    value={moodStart}
                    onChange={(event) => setMoodStart(event.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="mood-end" className="form-label fw-semibold">
                    Mood End
                  </label>
                  <input
                    id="mood-end"
                    type="number"
                    className="form-control shared-date-input"
                    min={0}
                    max={10}
                    step="any"
                    value={moodEnd}
                    onChange={(event) => setMoodEnd(event.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="mood-notes" className="form-label fw-semibold">
                    Notes
                  </label>
                  <textarea
                    id="mood-notes"
                    className="form-control"
                    rows={3}
                    value={moodNotes}
                    onChange={(event) => setMoodNotes(event.target.value)}
                  />
                </div>
              </>
            ) : null}

            {trackerKey === "homework" ? (
              <>
                {data.meta.subjects.length === 0 || data.meta.children.length === 0 ? (
                  <div className="alert alert-warning">
                    Add subjects and students in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label htmlFor="homework-subject" className="form-label fw-semibold">
                        Subject
                      </label>
                      <select
                        id="homework-subject"
                        className="form-select shared-date-input"
                        value={homeworkSubjectId}
                        onChange={(event) => setHomeworkSubjectId(event.target.value)}
                      >
                        <option value="">Select subject</option>
                        {data.meta.subjects.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="homework-child" className="form-label fw-semibold">
                        Student
                      </label>
                      <select
                        id="homework-child"
                        className="form-select shared-date-input"
                        value={homeworkChildId}
                        onChange={(event) => setHomeworkChildId(event.target.value)}
                      >
                        <option value="">Select student</option>
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
                      <div className="d-flex align-items-center gap-2 minutes-control-row">
                        <input
                          id="homework-minutes"
                          type="number"
                          className="form-control shared-date-input minutes-selector-input"
                          min={0}
                          max={1440}
                          step="any"
                          value={homeworkMinutes}
                          onChange={(event) => setHomeworkMinutes(event.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm minutes-step-btn"
                          aria-label="Subtract 5 homework minutes"
                          onClick={() => nudgeHomeworkMinutes(-5)}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm minutes-step-btn"
                          aria-label="Add 5 homework minutes"
                          onClick={() => nudgeHomeworkMinutes(5)}
                        >
                          +
                        </button>
                      </div>
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
                  </>
                )}
              </>
            ) : null}

            {trackerKey === "entertainment" ? (
              <>
                {data.meta.entertainment.length === 0 ? (
                  <div className="alert alert-warning">
                    Add entertainment options in Meta first. <Link to="/settings/meta">Open Metadata</Link>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Entertainment</label>
                    <div className="d-flex flex-column gap-2">
                      {data.meta.entertainment.map((item) => {
                        const isSelected = entertainmentMinutesById[item.id] !== undefined;
                        return (
                          <div key={item.id} className="workout-minute-row entertainment-minute-row" style={entertainmentWidthStyle}>
                            <button
                              type="button"
                              className={`btn workout-toggle-btn entertainment-toggle-btn ${isSelected ? "btn-primary" : "flag-toggle"}`}
                              onClick={() =>
                                setEntertainmentMinutesById((previous) => {
                                  if (previous[item.id] !== undefined) {
                                    const next = { ...previous };
                                    delete next[item.id];
                                    return next;
                                  }
                                  return { ...previous, [item.id]: "0" };
                                })
                              }
                            >
                              {item.name}
                            </button>
                            {isSelected ? (
                              <div className="d-flex align-items-center gap-2 workout-minute-controls minutes-control-row">
                                <input
                                  type="number"
                                  className="form-control shared-date-input minutes-selector-input"
                                  min={0}
                                  max={1440}
                                  step="any"
                                  value={entertainmentMinutesById[item.id]}
                                  onChange={(event) =>
                                    setEntertainmentMinutesById((previous) => ({
                                      ...previous,
                                      [item.id]: event.target.value
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm minutes-step-btn"
                                  aria-label={`Subtract 5 minutes from ${item.name}`}
                                  onClick={() => nudgeEntertainmentMinutes(item.id, -5)}
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm minutes-step-btn"
                                  aria-label={`Add 5 minutes to ${item.name}`}
                                  onClick={() => nudgeEntertainmentMinutes(item.id, 5)}
                                >
                                  +
                                </button>
                                <span className="text-secondary mb-0 minutes-unit-label">minutes</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
