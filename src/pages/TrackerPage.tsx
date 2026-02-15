import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CaloriesStackedChart } from "../components/CaloriesStackedChart";
import { CarbsStackedChart } from "../components/CarbsStackedChart";
import { ChoresHistogram } from "../components/ChoresHistogram";
import { EntertainmentCompositionChart } from "../components/EntertainmentCompositionChart";
import { FastingBarChart } from "../components/FastingBarChart";
import { HomeworkStackedChart } from "../components/HomeworkStackedChart";
import { MoodBoxPlot } from "../components/MoodBoxPlot";
import { SleepStackedChart } from "../components/SleepStackedChart";
import { ThresholdBarChart } from "../components/ThresholdBarChart";
import { SubstancesHistogram } from "../components/SubstancesHistogram";
import { WaterStackedChart } from "../components/WaterStackedChart";
import { WorkoutsCompositionChart } from "../components/WorkoutsCompositionChart";
import { WeightGraph } from "../components/WeightGraph";
import { useAppData } from "../context/AppDataContext";
import { compareDisplayDatesDesc, displayDateToIso, todayDisplayDate } from "../lib/date";
import { trackerKeys, trackerLabels, type AppSettings, type HomeworkEntry, type TrackerKey, type WeightEntry } from "../types";

function isTrackerKey(value: string): value is TrackerKey {
  return trackerKeys.includes(value as TrackerKey);
}

interface IsoRange {
  startIso: string;
  endIso: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function daysInMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function parseIsoDateToUtcDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const day = Number(dayPart);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    return null;
  }
  if (monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  if (day < 1 || day > daysInMonthUtc(year, monthIndex)) {
    return null;
  }
  return new Date(Date.UTC(year, monthIndex, day));
}

function getTodayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getYearsAndDaysSinceIsoDate(isoDate: string, todayUtc: Date): { years: number; days: number } | null {
  const lastUseDate = parseIsoDateToUtcDate(isoDate);
  if (!lastUseDate) {
    return null;
  }
  if (lastUseDate.getTime() > todayUtc.getTime()) {
    return { years: 0, days: 0 };
  }

  const startYear = lastUseDate.getUTCFullYear();
  const startMonth = lastUseDate.getUTCMonth();
  const startDay = lastUseDate.getUTCDate();
  const endYear = todayUtc.getUTCFullYear();

  let years = endYear - startYear;
  let anniversaryYear = startYear + years;
  let anniversaryDay = Math.min(startDay, daysInMonthUtc(anniversaryYear, startMonth));
  let anniversary = new Date(Date.UTC(anniversaryYear, startMonth, anniversaryDay));
  if (anniversary.getTime() > todayUtc.getTime()) {
    years -= 1;
    anniversaryYear = startYear + years;
    anniversaryDay = Math.min(startDay, daysInMonthUtc(anniversaryYear, startMonth));
    anniversary = new Date(Date.UTC(anniversaryYear, startMonth, anniversaryDay));
  }

  const days = Math.max(0, Math.floor((todayUtc.getTime() - anniversary.getTime()) / MS_PER_DAY));
  return { years, days };
}

function formatYearsAndDays(value: { years: number; days: number }): string {
  const daysLabel = value.days === 1 ? "day" : "days";
  if (value.years <= 0) {
    return `${value.days} ${daysLabel}`;
  }

  const yearsLabel = value.years === 1 ? "year" : "years";
  if (value.days <= 0) {
    return `${value.years} ${yearsLabel}`;
  }

  return `${value.years} ${yearsLabel}, ${value.days} ${daysLabel}`;
}

function formatSummaryNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function parseDisplayDateToDate(value: string): Date | null {
  const iso = displayDateToIso(value);
  if (!iso) {
    return null;
  }
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function maxDate(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function getEntryIsoRange(entries: Array<{ date: string }>): IsoRange | null {
  const isoDates = entries
    .map((entry) => displayDateToIso(entry.date))
    .filter((iso): iso is string => Boolean(iso))
    .sort((left, right) => left.localeCompare(right));

  if (isoDates.length === 0) {
    return null;
  }

  return {
    startIso: isoDates[0],
    endIso: isoDates[isoDates.length - 1]
  };
}

function computeWeightDefaultIsoRange(settings: AppSettings, entries: WeightEntry[]): IsoRange | null {
  const startWeight = settings.startingWeightLbs;
  const goalWeight = settings.weightGoalLbs;
  const expectedLossPerWeek = settings.weightLossPerWeekLbs;
  const startDate = settings.dietStartDate ? parseDisplayDateToDate(settings.dietStartDate) : null;

  if (
    startWeight === null ||
    goalWeight === null ||
    expectedLossPerWeek === null ||
    !startDate ||
    expectedLossPerWeek <= 0 ||
    startWeight <= goalWeight
  ) {
    return null;
  }

  const parsedEntries = entries
    .map((entry) => {
      const parsedDate = parseDisplayDateToDate(entry.date);
      if (!parsedDate) {
        return null;
      }
      return { date: parsedDate, weight: entry.weightLbs };
    })
    .filter((entry): entry is { date: Date; weight: number } => entry !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  const filteredEntries = parsedEntries.filter((entry) => entry.date.getTime() >= startDate.getTime());
  const poundsToLose = startWeight - goalWeight;
  const expectedWeeks = poundsToLose / expectedLossPerWeek;
  const expectedGoalDate = addDays(startDate, expectedWeeks * 7);
  const expectedEndDate = addDays(expectedGoalDate, 14);

  const latestEntry = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1] : null;
  const latestPlusTwo = latestEntry ? addDays(latestEntry.date, 14) : expectedEndDate;

  let projectedEndByActual = expectedEndDate;
  if (latestEntry) {
    const elapsedMs = latestEntry.date.getTime() - startDate.getTime();
    if (elapsedMs > 0) {
      const elapsedWeeks = elapsedMs / MS_PER_WEEK;
      const actualMeanLossPerWeek = (startWeight - latestEntry.weight) / elapsedWeeks;
      if (actualMeanLossPerWeek > 0) {
        const projectedWeeks = poundsToLose / actualMeanLossPerWeek;
        const actualGoalDate = addDays(startDate, projectedWeeks * 7);
        projectedEndByActual = addDays(actualGoalDate, 14);
      }
    }
  }

  const endDate = maxDate([expectedEndDate, latestPlusTwo, projectedEndByActual]);

  return {
    startIso: toIsoDate(startDate),
    endIso: toIsoDate(endDate)
  };
}

function normalizeIsoRange(startIso: string, endIso: string): IsoRange {
  if (startIso <= endIso) {
    return { startIso, endIso };
  }
  return { startIso: endIso, endIso: startIso };
}

export function TrackerPage() {
  const { trackerKey } = useParams();
  const { data, removeTrackerEntry, chartDateRangePreferences } = useAppData();
  const [homeworkTrackerStudentFilter, setHomeworkTrackerStudentFilter] = useState<string>("");

  if (!trackerKey || !isTrackerKey(trackerKey)) {
    return <Navigate to="/" replace />;
  }

  const entries = useMemo(() => {
    if (trackerKey === "homework") {
      return [...data.trackers.homework];
    }
    return [...data.trackers[trackerKey]].sort((left, right) => compareDisplayDatesDesc(left.date, right.date));
  }, [data.trackers, trackerKey]);

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
  const entertainmentNames = useMemo(
    () => Object.fromEntries(data.meta.entertainment.map((item) => [item.id, item.name])),
    [data.meta.entertainment]
  );
  const visibleEntries = useMemo(() => {
    if (trackerKey !== "homework" || !homeworkTrackerStudentFilter) {
      return entries;
    }
    return (entries as HomeworkEntry[]).filter((entry) => entry.childId === homeworkTrackerStudentFilter);
  }, [entries, trackerKey, homeworkTrackerStudentFilter]);

  useEffect(() => {
    if (trackerKey !== "homework") {
      return;
    }
    if (homeworkTrackerStudentFilter && !data.meta.children.some((item) => item.id === homeworkTrackerStudentFilter)) {
      setHomeworkTrackerStudentFilter("");
    }
  }, [trackerKey, homeworkTrackerStudentFilter, data.meta.children]);

  const fallbackIso = useMemo(() => displayDateToIso(todayDisplayDate()), []);
  const defaultChartRange = useMemo<IsoRange>(() => {
    const fallbackRange: IsoRange = { startIso: fallbackIso, endIso: fallbackIso };
    if (trackerKey === "weight") {
      return computeWeightDefaultIsoRange(data.settings, data.trackers.weight) ?? getEntryIsoRange(data.trackers.weight) ?? fallbackRange;
    }
    if (trackerKey === "steps") {
      return getEntryIsoRange(data.trackers.steps) ?? fallbackRange;
    }
    if (trackerKey === "carbs") {
      return getEntryIsoRange(data.trackers.carbs) ?? fallbackRange;
    }
    if (trackerKey === "water") {
      return getEntryIsoRange(data.trackers.water) ?? fallbackRange;
    }
    if (trackerKey === "fasting") {
      return getEntryIsoRange(data.trackers.fasting) ?? fallbackRange;
    }
    if (trackerKey === "calories") {
      return getEntryIsoRange(data.trackers.calories) ?? fallbackRange;
    }
    if (trackerKey === "sleep") {
      return getEntryIsoRange(data.trackers.sleep) ?? fallbackRange;
    }
    if (trackerKey === "workouts") {
      return getEntryIsoRange(data.trackers.workouts) ?? fallbackRange;
    }
    if (trackerKey === "mood") {
      return getEntryIsoRange(data.trackers.mood) ?? fallbackRange;
    }
    if (trackerKey === "homework") {
      return getEntryIsoRange(data.trackers.homework) ?? fallbackRange;
    }
    if (trackerKey === "cleaning") {
      return getEntryIsoRange(data.trackers.cleaning) ?? fallbackRange;
    }
    if (trackerKey === "substances") {
      return getEntryIsoRange(data.trackers.substances) ?? fallbackRange;
    }
    if (trackerKey === "entertainment") {
      return getEntryIsoRange(data.trackers.entertainment) ?? fallbackRange;
    }
    return fallbackRange;
  }, [trackerKey, fallbackIso, data.settings, data.trackers]);

  const configuredChartRange = useMemo<IsoRange>(() => {
    const startIso =
      chartDateRangePreferences.startMode === "user" ? chartDateRangePreferences.startIso : defaultChartRange.startIso;
    const endIso = chartDateRangePreferences.endMode === "user" ? chartDateRangePreferences.endIso : defaultChartRange.endIso;
    return normalizeIsoRange(startIso, endIso);
  }, [
    chartDateRangePreferences.startMode,
    chartDateRangePreferences.startIso,
    chartDateRangePreferences.endMode,
    chartDateRangePreferences.endIso,
    defaultChartRange.startIso,
    defaultChartRange.endIso
  ]);

  const [draftStartIso, setDraftStartIso] = useState(configuredChartRange.startIso);
  const [draftEndIso, setDraftEndIso] = useState(configuredChartRange.endIso);
  const [appliedStartIso, setAppliedStartIso] = useState(configuredChartRange.startIso);
  const [appliedEndIso, setAppliedEndIso] = useState(configuredChartRange.endIso);

  useEffect(() => {
    setDraftStartIso(configuredChartRange.startIso);
    setDraftEndIso(configuredChartRange.endIso);
    setAppliedStartIso(configuredChartRange.startIso);
    setAppliedEndIso(configuredChartRange.endIso);
  }, [trackerKey, configuredChartRange.startIso, configuredChartRange.endIso]);

  const applyGraphDateFilter = () => {
    const nextStartIso = draftStartIso || configuredChartRange.startIso;
    const nextEndIso = draftEndIso || configuredChartRange.endIso;
    const normalized = normalizeIsoRange(nextStartIso, nextEndIso);
    setDraftStartIso(normalized.startIso);
    setDraftEndIso(normalized.endIso);
    setAppliedStartIso(normalized.startIso);
    setAppliedEndIso(normalized.endIso);
  };

  function isDateWithinAppliedRange(displayDate: string): boolean {
    const iso = displayDateToIso(displayDate);
    if (!iso) {
      return false;
    }
    return iso >= appliedStartIso && iso <= appliedEndIso;
  }

  function filterByAppliedDate<T extends { date: string }>(source: T[]): T[] {
    return source.filter((entry) => isDateWithinAppliedRange(entry.date));
  }

  const filteredChartTrackers = useMemo(
    () => ({
      weight: filterByAppliedDate(data.trackers.weight),
      fasting: filterByAppliedDate(data.trackers.fasting),
      water: filterByAppliedDate(data.trackers.water),
      carbs: filterByAppliedDate(data.trackers.carbs),
      calories: filterByAppliedDate(data.trackers.calories),
      workouts: filterByAppliedDate(data.trackers.workouts),
      steps: filterByAppliedDate(data.trackers.steps),
      sleep: filterByAppliedDate(data.trackers.sleep),
      mood: filterByAppliedDate(data.trackers.mood),
      homework: filterByAppliedDate(data.trackers.homework),
      cleaning: filterByAppliedDate(data.trackers.cleaning),
      substances: filterByAppliedDate(data.trackers.substances),
      entertainment: filterByAppliedDate(data.trackers.entertainment)
    }),
    [data.trackers, appliedStartIso, appliedEndIso]
  );
  const substancesTimeSinceLastUse = useMemo(() => {
    if (trackerKey !== "substances") {
      return [];
    }

    const latestUseById = new Map<string, string>();
    for (const entry of data.trackers.substances) {
      const iso = displayDateToIso(entry.date);
      if (!iso) {
        continue;
      }

      const uniqueSubstanceIds = new Set(entry.substanceIds);
      for (const substanceId of uniqueSubstanceIds) {
        const existingIso = latestUseById.get(substanceId);
        if (!existingIso || iso > existingIso) {
          latestUseById.set(substanceId, iso);
        }
      }
    }

    const todayUtc = getTodayUtcDate();
    return data.meta.substances.map((substance) => {
      const lastUseIso = latestUseById.get(substance.id);
      if (!lastUseIso) {
        return {
          id: substance.id,
          name: substance.name,
          sinceText: "N/A"
        };
      }
      const elapsed = getYearsAndDaysSinceIsoDate(lastUseIso, todayUtc);
      return {
        id: substance.id,
        name: substance.name,
        sinceText: elapsed ? formatYearsAndDays(elapsed) : "N/A"
      };
    });
  }, [trackerKey, data.trackers.substances, data.meta.substances]);

  const showGraphDateControls =
    trackerKey === "weight" ||
    trackerKey === "steps" ||
    trackerKey === "carbs" ||
    trackerKey === "water" ||
    trackerKey === "fasting" ||
    trackerKey === "calories" ||
    trackerKey === "sleep" ||
    trackerKey === "workouts" ||
    trackerKey === "mood" ||
    trackerKey === "homework" ||
    trackerKey === "cleaning" ||
    trackerKey === "substances" ||
    trackerKey === "entertainment";
  const hasTrackerEntries = entries.length > 0;

  const renderGraphDateControls = () =>
    showGraphDateControls && hasTrackerEntries ? (
      <div className="graph-date-filter mt-3">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <span className="fw-semibold">Date Range:</span>
          <input
            className="form-control graph-date-filter-input"
            type="date"
            value={draftStartIso}
            onChange={(event) => setDraftStartIso(event.target.value)}
          />
          <span className="text-secondary">to</span>
          <input
            className="form-control graph-date-filter-input"
            type="date"
            value={draftEndIso}
            onChange={(event) => setDraftEndIso(event.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm tracker-add-entry-btn" type="button" onClick={applyGraphDateFilter}>
          Filter
        </button>
      </div>
    ) : null;

  return (
    <section className="row g-3">
      {trackerKey === "weight" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Weight Graph</h2>
              <WeightGraph
                settings={data.settings}
                entries={filteredChartTrackers.weight}
                rangeStartIso={appliedStartIso}
                rangeEndIso={appliedEndIso}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "substances" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Substances Histogram</h2>
              <SubstancesHistogram entries={filteredChartTrackers.substances} substances={data.meta.substances} />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "substances" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Time Since Last Use</h2>
              {data.meta.substances.length === 0 ? (
                <p className="text-secondary mb-0">Add substance options in Metadata to track time since last use.</p>
              ) : (
                <ul className="list-group last-use-list">
                  {substancesTimeSinceLastUse.map((item) => (
                    <li
                      key={item.id}
                      className="list-group-item last-use-row d-flex justify-content-between align-items-center gap-2"
                    >
                      <span className="fw-semibold">{item.name}</span>
                      <span className="text-secondary time-since-value">{item.sinceText}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "cleaning" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Chores Chart</h2>
              <ChoresHistogram entries={filteredChartTrackers.cleaning} chores={data.meta.chores} />
              {renderGraphDateControls()}
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
                entries={filteredChartTrackers.steps.map((entry) => ({ id: entry.id, date: entry.date, value: entry.steps }))}
                threshold={data.settings.dailyStepsGoal}
                thresholdLabel="Daily Steps Goal"
                valueLabel="Steps"
                formatWithCommas
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "carbs" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <CarbsStackedChart
                entries={filteredChartTrackers.carbs.map((entry) => ({
                  id: entry.id,
                  date: entry.date,
                  carbs: entry.carbs,
                  notes: entry.notes
                }))}
                threshold={data.settings.carbLimitPerDay}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "water" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <WaterStackedChart
                entries={filteredChartTrackers.water.map((entry) => ({
                  id: entry.id,
                  date: entry.date,
                  liters: entry.liters
                }))}
                threshold={data.settings.waterGoalPerDay}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "fasting" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <FastingBarChart entries={filteredChartTrackers.fasting} />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "calories" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <CaloriesStackedChart
                entries={filteredChartTrackers.calories.map((entry) => ({
                  id: entry.id,
                  date: entry.date,
                  calories: entry.calories,
                  notes: entry.notes
                }))}
                threshold={data.settings.calorieLimitPerDay}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "sleep" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <SleepStackedChart entries={filteredChartTrackers.sleep} />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "workouts" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <WorkoutsCompositionChart
                entries={filteredChartTrackers.workouts}
                workouts={data.meta.workouts}
                theme={data.settings.theme}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "mood" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <MoodBoxPlot entries={filteredChartTrackers.mood} />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "homework" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <HomeworkStackedChart
                entries={filteredChartTrackers.homework.map((entry) => ({
                  id: entry.id,
                  date: entry.date,
                  minutes: entry.minutes,
                  notes: entry.notes,
                  studentId: entry.childId,
                  subjectName: subjectNames[entry.subjectId] ?? "Unknown subject"
                }))}
                students={data.meta.children}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      {trackerKey === "entertainment" ? (
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <EntertainmentCompositionChart
                entries={filteredChartTrackers.entertainment}
                entertainment={data.meta.entertainment}
                theme={data.settings.theme}
              />
              {renderGraphDateControls()}
            </div>
          </div>
        </div>
      ) : null}

      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h2 className="h5 mb-0">{trackerLabels[trackerKey]} Tracker</h2>
              <div className="d-flex align-items-center flex-wrap gap-2">
                {trackerKey === "homework" ? (
                  <select
                    className="form-select form-select-sm homework-tracker-student-select"
                    value={homeworkTrackerStudentFilter}
                    onChange={(event) => setHomeworkTrackerStudentFilter(event.target.value)}
                  >
                    <option value="">All Students</option>
                    {data.meta.children.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Link className="btn btn-sm btn-primary tracker-add-entry-btn" to={`/input/${trackerKey}`}>
                  Add Entry
                </Link>
              </div>
            </div>

            {visibleEntries.length === 0 ? (
              <p className="text-secondary mb-0">No entries yet.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {visibleEntries.map((entry) => {
                  const item = entry as unknown as Record<string, unknown>;
                  const activities = Array.isArray(item.activities)
                    ? (item.activities as Array<{ metaId: string; minutes: number }>)
                    : [];
                  const choreIds = Array.isArray(item.choreIds) ? (item.choreIds as string[]) : [];
                  const substanceIds = Array.isArray(item.substanceIds) ? (item.substanceIds as string[]) : [];
                  const entertainmentIds = Array.isArray(item.entertainmentIds) ? (item.entertainmentIds as string[]) : [];
                  const notes = typeof item.notes === "string" ? item.notes : "";
                  const subjectId = typeof item.subjectId === "string" ? item.subjectId : "";
                  const childId = typeof item.childId === "string" ? item.childId : "";
                  const minutes = typeof item.minutes === "number" ? item.minutes : 0;
                  const entertainmentActivities = Array.isArray(item.activities)
                    ? (item.activities as Array<{ metaId: string; minutes: number }>)
                    : [];
                  const weightLbs = typeof item.weightLbs === "number" ? item.weightLbs : 0;
                  const hours = typeof item.hours === "number" ? item.hours : 0;
                  const carbs = typeof item.carbs === "number" ? item.carbs : 0;
                  const liters = typeof item.liters === "number" ? item.liters : 0;
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
                  const entertainmentSummary =
                    entertainmentActivities.length > 0
                      ? entertainmentActivities
                          .map(
                            (activity) =>
                              `${(entertainmentNames[activity.metaId] as string | undefined) ?? "Unknown item"}: ${activity.minutes} min`
                          )
                          .join(" | ")
                      : entertainmentIds
                          .map((id) => (entertainmentNames[id] as string | undefined) ?? "Unknown item")
                          .join(", ") || "(none)";

                  let primarySummary = "";
                  if (trackerKey === "weight") {
                    primarySummary = `Weight (lbs): ${formatSummaryNumber(weightLbs)}`;
                  } else if (trackerKey === "fasting") {
                    primarySummary = `Hours: ${hours}`;
                  } else if (trackerKey === "carbs") {
                    primarySummary = `Carbs (g): ${formatSummaryNumber(carbs)}`;
                  } else if (trackerKey === "water") {
                    primarySummary = `Water (L): ${formatSummaryNumber(liters)}`;
                  } else if (trackerKey === "calories") {
                    primarySummary = `Calories: ${formatSummaryNumber(calories)}`;
                  } else if (trackerKey === "steps") {
                    primarySummary = `Steps: ${formatSummaryNumber(steps)}`;
                  } else if (trackerKey === "sleep") {
                    primarySummary = `${sleepTime || "(unset)"} - ${wakeTime || "(unset)"}`;
                  } else if (trackerKey === "mood") {
                    primarySummary = `Mood Start: ${formatSummaryNumber(moodStart)} | Mood End: ${formatSummaryNumber(moodEnd)}`;
                  } else if (trackerKey === "workouts") {
                    primarySummary = workoutSummary;
                  } else if (trackerKey === "homework") {
                    primarySummary = `Subject: ${(subjectNames[subjectId] as string | undefined) ?? "Unknown subject"} | Student: ${(childNames[childId] as string | undefined) ?? "Unknown student"} | Minutes: ${minutes}`;
                  } else if (trackerKey === "cleaning") {
                    primarySummary = choresSummary;
                  } else if (trackerKey === "substances") {
                    primarySummary = substancesSummary;
                  } else if (trackerKey === "entertainment") {
                    primarySummary = entertainmentSummary;
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
                            Delete
                          </button>
                        </div>

                        {(trackerKey === "homework" ||
                          trackerKey === "cleaning" ||
                          trackerKey === "carbs" ||
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
