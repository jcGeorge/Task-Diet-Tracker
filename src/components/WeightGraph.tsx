import { useState } from "react";
import { Link } from "react-router-dom";
import { displayDateToIso } from "../lib/date";
import type { AppSettings, WeightEntry } from "../types";

interface WeightGraphProps {
  settings: AppSettings;
  entries: WeightEntry[];
}

interface Point {
  date: Date;
  weight: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 48, bottom: 52, left: 58 };
const TOOLTIP_WIDTH = 176;
const TOOLTIP_HEIGHT = 52;

function parseDisplayDate(value: string): Date | null {
  const iso = displayDateToIso(value);
  if (!iso) {
    return null;
  }
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function maxDate(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildPath(points: Point[], xForDate: (date: Date) => number, yForWeight: (weight: number) => number): string {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xForDate(point.date).toFixed(2)} ${yForWeight(point.weight).toFixed(2)}`)
    .join(" ");
}

function formatAxisDate(date: Date, includeYear: boolean): string {
  return date.toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: includeYear ? "2-digit" : undefined
  });
}

function formatTooltipDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function formatWeight(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function WeightGraph({ settings, entries }: WeightGraphProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: Date; weight: number } | null>(null);

  const startWeight = settings.startingWeightLbs;
  const goalWeight = settings.weightGoalLbs;
  const expectedLossPerWeek = settings.weightLossPerWeekLbs;
  const startDate = settings.dietStartDate ? parseDisplayDate(settings.dietStartDate) : null;

  if (startWeight === null || goalWeight === null || expectedLossPerWeek === null || !startDate) {
    return (
      <div className="d-flex flex-column align-items-start gap-2">
        <p className="mb-0 text-secondary">Please fill out all Diet Baseline items for the weight graph to appear</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  if (expectedLossPerWeek <= 0) {
    return <p className="mb-0 text-secondary">Weight Loss Per Week must be greater than 0 to render expected progress.</p>;
  }

  const poundsToLose = startWeight - goalWeight;
  if (poundsToLose <= 0) {
    return <p className="mb-0 text-secondary">Starting Weight must be higher than Weight Goal for this graph.</p>;
  }

  const parsedEntries = entries
    .map((entry) => {
      const parsedDate = parseDisplayDate(entry.date);
      if (!parsedDate) {
        return null;
      }
      return {
        id: entry.id,
        date: parsedDate,
        weight: entry.weightLbs
      };
    })
    .filter((entry): entry is { id: string; date: Date; weight: number } => entry !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  const filteredEntries = parsedEntries.filter((entry) => entry.date.getTime() >= startDate.getTime());
  const expectedWeeks = poundsToLose / expectedLossPerWeek;
  const expectedGoalDate = addDays(startDate, expectedWeeks * 7);
  const expectedEndDate = addDays(expectedGoalDate, 14);

  const latestEntry = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1] : null;
  const latestPlusTwo = latestEntry ? addDays(latestEntry.date, 14) : expectedEndDate;

  let actualMeanLossPerWeek: number | null = null;
  let actualGoalDate: Date | null = null;
  let projectedEndByActual = expectedEndDate;
  if (latestEntry) {
    const elapsedMs = latestEntry.date.getTime() - startDate.getTime();
    if (elapsedMs > 0) {
      const elapsedWeeks = elapsedMs / MS_PER_WEEK;
      actualMeanLossPerWeek = (startWeight - latestEntry.weight) / elapsedWeeks;
      if (actualMeanLossPerWeek > 0) {
        const projectedWeeks = poundsToLose / actualMeanLossPerWeek;
        actualGoalDate = addDays(startDate, projectedWeeks * 7);
        projectedEndByActual = addDays(actualGoalDate, 14);
      }
    }
  }

  const endDate = maxDate([expectedEndDate, latestPlusTwo, projectedEndByActual]);

  let yMax = Math.round((startWeight + 10) / 10) * 10;
  let yMin = Math.round((goalWeight - 10) / 10) * 10;
  if (yMax <= yMin) {
    yMax = Math.ceil(Math.max(startWeight, goalWeight) / 10) * 10;
    yMin = Math.floor(Math.min(startWeight, goalWeight) / 10) * 10;
    if (yMax <= yMin) {
      yMax = yMin + 10;
    }
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const xSpan = Math.max(endDate.getTime() - startDate.getTime(), MS_PER_DAY);
  const ySpan = Math.max(yMax - yMin, 10);

  const xForDate = (date: Date): number => PADDING.left + ((date.getTime() - startDate.getTime()) / xSpan) * plotWidth;
  const yForWeight = (weight: number): number => PADDING.top + ((yMax - weight) / ySpan) * plotHeight;

  const projectedSeries: Point[] = [
    { date: startDate, weight: startWeight },
    { date: expectedGoalDate, weight: goalWeight }
  ];
  if (endDate.getTime() > expectedGoalDate.getTime()) {
    projectedSeries.push({ date: endDate, weight: goalWeight });
  }

  const actualSeries: Point[] = [{ date: startDate, weight: startWeight }, ...filteredEntries.map((entry) => ({ date: entry.date, weight: entry.weight }))];

  const projectedPath = buildPath(projectedSeries, xForDate, yForWeight);
  const actualPath = buildPath(actualSeries, xForDate, yForWeight);
  const latestActualPoint = actualSeries.length > 0 ? actualSeries[actualSeries.length - 1] : null;
  const actualMeanSeries: Point[] =
    actualGoalDate && actualMeanLossPerWeek && actualMeanLossPerWeek > 0 && latestActualPoint && filteredEntries.length > 0
      ? [
          { date: latestActualPoint.date, weight: latestActualPoint.weight },
          { date: actualGoalDate, weight: goalWeight },
          ...(endDate.getTime() > actualGoalDate.getTime() ? [{ date: endDate, weight: goalWeight }] : [])
        ]
      : [];
  const actualMeanPath = buildPath(actualMeanSeries, xForDate, yForWeight);

  const xTickCount = 6;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, index) => {
    const ratio = index / xTickCount;
    return new Date(startDate.getTime() + ratio * xSpan);
  });

  const yTicks: number[] = [];
  for (let value = yMax; value >= yMin; value -= 10) {
    yTicks.push(value);
  }
  if (yTicks.length === 0 || yTicks[yTicks.length - 1] !== yMin) {
    yTicks.push(yMin);
  }

  const tooltipPosition = hoveredPoint
    ? {
        x: clamp(hoveredPoint.x + 10, PADDING.left + 6, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 6),
        y: clamp(hoveredPoint.y - TOOLTIP_HEIGHT - 8, PADDING.top + 6, CHART_HEIGHT - PADDING.bottom - TOOLTIP_HEIGHT - 6)
      }
    : null;

  return (
    <div className="weight-graph-wrap">
      <div className="graph-legend mb-2">
        <span className="legend-item">
          <span className="legend-swatch legend-expected" />
          Projected
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-actual" />
          Actual
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-mean" />
          Actual Projection
        </span>
      </div>

      <svg
        className="weight-graph-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Weight progress graph"
      >
        {yTicks.map((tick) => {
          const y = yForWeight(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(127,127,127,0.25)" />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {xTicks.map((tick, index) => {
          const x = xForDate(tick);
          const includeYear = index === 0 || index === xTicks.length - 1;
          const textAnchor = index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle";
          return (
            <g key={`x-${tick.getTime()}`}>
              <line x1={x} y1={PADDING.top} x2={x} y2={CHART_HEIGHT - PADDING.bottom} stroke="rgba(127,127,127,0.2)" />
              <text x={x} y={CHART_HEIGHT - PADDING.bottom + 18} textAnchor={textAnchor} fontSize="11" fill="currentColor">
                {formatAxisDate(tick, includeYear)}
              </text>
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          y1={CHART_HEIGHT - PADDING.bottom}
          x2={CHART_WIDTH - PADDING.right}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="currentColor"
          strokeOpacity="0.6"
        />
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={CHART_HEIGHT - PADDING.bottom} stroke="currentColor" strokeOpacity="0.6" />

        {projectedPath ? <path d={projectedPath} fill="none" stroke="#dc3545" strokeWidth="3" /> : null}
        {actualMeanPath ? <path d={actualMeanPath} fill="none" stroke="#2fbf71" strokeWidth="2.4" strokeDasharray="6 5" /> : null}
        {actualPath ? <path d={actualPath} fill="none" stroke="#198754" strokeWidth="3" /> : null}

        {actualSeries.map((point, index) => {
          const x = xForDate(point.date);
          const y = yForWeight(point.weight);
          return (
            <circle
              key={`actual-${index}-${point.date.getTime()}`}
              cx={x}
              cy={y}
              r={4}
              fill="#198754"
              onMouseEnter={() => setHoveredPoint({ x, y, date: point.date, weight: point.weight })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {hoveredPoint && tooltipPosition ? (
          <g pointerEvents="none">
            <rect
              x={tooltipPosition.x}
              y={tooltipPosition.y}
              width={TOOLTIP_WIDTH}
              height={TOOLTIP_HEIGHT}
              rx={6}
              ry={6}
              fill="rgba(23, 28, 34, 0.92)"
              stroke="rgba(255,255,255,0.18)"
            />
            <text x={tooltipPosition.x + 10} y={tooltipPosition.y + 20} fontSize="12" fill="#ffffff">
              {formatTooltipDate(hoveredPoint.date)}
            </text>
            <text x={tooltipPosition.x + 10} y={tooltipPosition.y + 38} fontSize="12" fill="#d7f7e5">
              {`Weight: ${formatWeight(hoveredPoint.weight)} lbs`}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="graph-metrics mt-3">
        <div className="graph-metric">
          <span className="graph-metric-label">Projected Completion Date</span>
          <span className="graph-metric-value">{formatTooltipDate(expectedGoalDate)}</span>
        </div>
        <div className="graph-metric">
          <span className="graph-metric-label">Projected Weekly Weight Loss</span>
          <span className="graph-metric-value">{`${formatWeight(expectedLossPerWeek)} lbs/week`}</span>
        </div>
        <div className="graph-metric">
          <span className="graph-metric-label">Actual Estimated Goal Date</span>
          <span className="graph-metric-value">
            {actualGoalDate ? formatTooltipDate(actualGoalDate) : "Not enough data"}
          </span>
        </div>
        <div className="graph-metric">
          <span className="graph-metric-label">Actual Weekly Weight Loss</span>
          <span className="graph-metric-value">
            {actualMeanLossPerWeek === null
              ? "Not enough data"
              : actualMeanLossPerWeek <= 0
                ? "Not currently losing"
                : `${formatWeight(actualMeanLossPerWeek)} lbs/week`}
          </span>
        </div>
      </div>
    </div>
  );
}
