import { useMemo, useState } from "react";
import { displayDateToIso } from "../lib/date";
import { normalizeTimeDisplay, parseTimeToMinutes } from "../lib/time";
import type { SleepEntry } from "../types";

interface SleepStackedChartProps {
  entries: SleepEntry[];
}

interface DailySegment {
  id: string;
  sleepTime: string;
  wakeTime: string;
  hoursSlept: number;
}

interface DailyGroup {
  date: string;
  isoDate: string;
  totalHours: number;
  segments: DailySegment[];
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 290;
const TOOLTIP_HEIGHT = 72;
const SEGMENT_COLORS = ["#198754", "#0d6efd", "#9a66d8"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildStep(maxValue: number): number {
  if (maxValue <= 0) {
    return 1;
  }
  const raw = maxValue / 6;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const nice =
    normalized <= 1 ? 1 :
    normalized <= 2 ? 2 :
    normalized <= 5 ? 5 :
    10;
  return nice * magnitude;
}

function computeHoursSlept(sleepTime: string, wakeTime: string): number {
  const sleepMinutes = parseTimeToMinutes(sleepTime);
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  if (sleepMinutes === null || wakeMinutes === null) {
    return 0;
  }

  let durationMinutes = wakeMinutes - sleepMinutes;
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  } else if (durationMinutes === 0) {
    return 0;
  }

  return durationMinutes / 60;
}

function formatDate(value: string): string {
  const iso = displayDateToIso(value);
  if (!iso) {
    return value;
  }
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function formatHours(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildDailyGroups(entries: SleepEntry[]): DailyGroup[] {
  const groups = new Map<string, DailyGroup>();

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const isoDate = displayDateToIso(entry.date);
    if (!isoDate) {
      continue;
    }

    const hoursSlept = computeHoursSlept(entry.sleepTime, entry.wakeTime);
    const sleepLabel = normalizeTimeDisplay(entry.sleepTime) ?? entry.sleepTime;
    const wakeLabel = normalizeTimeDisplay(entry.wakeTime) ?? entry.wakeTime;
    const existing = groups.get(isoDate);
    if (!existing) {
      groups.set(isoDate, {
        date: entry.date,
        isoDate,
        totalHours: hoursSlept,
        segments: [
          {
            id: entry.id,
            sleepTime: sleepLabel,
            wakeTime: wakeLabel,
            hoursSlept
          }
        ]
      });
      continue;
    }

    existing.totalHours += hoursSlept;
    existing.segments.push({
      id: entry.id,
      sleepTime: sleepLabel,
      wakeTime: wakeLabel,
      hoursSlept
    });
  }

  return [...groups.values()].sort((left, right) => left.isoDate.localeCompare(right.isoDate));
}

export function SleepStackedChart({ entries }: SleepStackedChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<{
    x: number;
    y: number;
    date: string;
    sleepTime: string;
    wakeTime: string;
    hoursSlept: number;
  } | null>(null);

  const dailyGroups = useMemo(() => buildDailyGroups(entries), [entries]);

  if (dailyGroups.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-0">No entries yet.</p>
      </div>
    );
  }

  const maxValue = Math.max(...dailyGroups.map((group) => group.totalHours), 1);
  const step = buildStep(maxValue);
  const yMax = Math.ceil(maxValue / step) * step;
  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, index) => index * step);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(dailyGroups.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 16, 72);

  const tooltip = hoveredSegment
    ? {
        x: clamp(hoveredSegment.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredSegment.y - TOOLTIP_HEIGHT - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - TOOLTIP_HEIGHT - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <h2 className="h5 mb-3">Sleep Chart</h2>
      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Sleep stacked bar chart"
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={`sleep-tick-${tick}`}>
              <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(127,127,127,0.24)" />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {formatHours(tick)}
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
          strokeOpacity="0.65"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="currentColor"
          strokeOpacity="0.65"
        />

        {dailyGroups.map((group, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          let runningHours = 0;

          return (
            <g key={group.isoDate}>
              {group.segments.map((segment, segmentIndex) => {
                const startHours = runningHours;
                runningHours += segment.hoursSlept;
                const yTop = PADDING.top + plotHeight - (runningHours / yMax) * plotHeight;
                const yBottom = PADDING.top + plotHeight - (startHours / yMax) * plotHeight;
                const height = Math.max(yBottom - yTop, 1);
                const color = SEGMENT_COLORS[segmentIndex % SEGMENT_COLORS.length];

                return (
                  <rect
                    key={segment.id}
                    x={x}
                    y={yTop}
                    width={barWidth}
                    height={height}
                    fill={color}
                    opacity={0.94}
                    onMouseEnter={() =>
                      setHoveredSegment({
                        x: x + barWidth / 2,
                        y: yTop,
                        date: group.date,
                        sleepTime: segment.sleepTime,
                        wakeTime: segment.wakeTime,
                        hoursSlept: segment.hoursSlept
                      })
                    }
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                );
              })}

              <text x={x + barWidth / 2} y={CHART_HEIGHT - PADDING.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor">
                {formatDate(group.date)}
              </text>
            </g>
          );
        })}

        {hoveredSegment && tooltip ? (
          <g pointerEvents="none">
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width={TOOLTIP_WIDTH}
              height={TOOLTIP_HEIGHT}
              rx={6}
              ry={6}
              fill="var(--graph-tooltip-bg)"
              stroke="var(--graph-tooltip-border)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="var(--graph-tooltip-text)">
              {hoveredSegment.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="var(--graph-tooltip-accent-1)">
              {`Sleep Start: ${hoveredSegment.sleepTime} | Sleep End: ${hoveredSegment.wakeTime}`}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize="12" fill="var(--graph-tooltip-accent-2)">
              {`Hours Slept: ${formatHours(hoveredSegment.hoursSlept)}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

