import { useMemo, useState } from "react";
import { displayDateToIso } from "../lib/date";
import type { MoodEntry } from "../types";

interface MoodBoxPlotProps {
  entries: MoodEntry[];
}

interface MoodPoint {
  id: string;
  date: string;
  moodStart: number;
  moodEnd: number;
  notes: string;
  isoDate: string;
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 280;
const BASE_TOOLTIP_HEIGHT = 70;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function formatMood(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function MoodBoxPlot({ entries }: MoodBoxPlotProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    moodStart: number;
    moodEnd: number;
    notes: string;
  } | null>(null);

  const points = useMemo<MoodPoint[]>(
    () =>
      entries
        .map((entry) => ({
          id: entry.id,
          date: entry.date,
          moodStart: entry.moodStart,
          moodEnd: entry.moodEnd,
          notes: entry.notes,
          isoDate: displayDateToIso(entry.date)
        }))
        .filter((entry) => !!entry.isoDate)
        .sort((left, right) => (left.isoDate === right.isoDate ? left.id.localeCompare(right.id) : left.isoDate.localeCompare(right.isoDate))),
    [entries]
  );

  if (points.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-0">No entries yet.</p>
      </div>
    );
  }

  const yMin = 0;
  const yMax = 10;
  const ySpan = yMax - yMin;
  const yTicks = Array.from({ length: 11 }, (_, index) => index);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const boxWidth = clamp(slotWidth * 0.58, 14, 64);

  const yForValue = (value: number): number => {
    const clamped = clamp(value, yMin, yMax);
    return PADDING.top + ((yMax - clamped) / ySpan) * plotHeight;
  };

  const tooltipLineCount = hoveredPoint?.notes ? 4 : 3;
  const tooltipHeight = BASE_TOOLTIP_HEIGHT + (tooltipLineCount - 3) * 18;
  const tooltip = hoveredPoint
    ? {
        x: clamp(hoveredPoint.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredPoint.y - tooltipHeight - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - tooltipHeight - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <h2 className="h5 mb-3">Mood Box Plot</h2>
      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mood box plot"
      >
        {yTicks.map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={`mood-tick-${tick}`}>
              <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(127,127,127,0.24)" />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {tick}
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

        {points.map((point, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - boxWidth) / 2;
          const low = Math.min(point.moodStart, point.moodEnd);
          const high = Math.max(point.moodStart, point.moodEnd);
          const yHigh = yForValue(high);
          const yLow = yForValue(low);
          const equalValues = Math.abs(point.moodStart - point.moodEnd) < 0.000001;
          const padding = equalValues ? 4 : 0;
          const y = yHigh - padding;
          const height = Math.max(yLow - yHigh + padding * 2, 1);
          const color =
            equalValues
              ? "#6c757d"
              : point.moodStart > point.moodEnd
                ? "#dc3545"
                : "#198754";

          return (
            <g key={point.id}>
              <rect
                x={x}
                y={y}
                width={boxWidth}
                height={height}
                fill={color}
                opacity={0.92}
                rx={3}
                ry={3}
                onMouseEnter={() =>
                  setHoveredPoint({
                    x: x + boxWidth / 2,
                    y,
                    date: point.date,
                    moodStart: point.moodStart,
                    moodEnd: point.moodEnd,
                    notes: point.notes
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <text x={x + boxWidth / 2} y={CHART_HEIGHT - PADDING.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor">
                {formatDate(point.date)}
              </text>
            </g>
          );
        })}

        {hoveredPoint && tooltip ? (
          <g pointerEvents="none">
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width={TOOLTIP_WIDTH}
              height={tooltipHeight}
              rx={6}
              ry={6}
              fill="rgba(23, 28, 34, 0.92)"
              stroke="rgba(255,255,255,0.2)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="#ffffff">
              {hoveredPoint.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="#d7f7e5">
              {`Mood Start: ${formatMood(hoveredPoint.moodStart)} | Mood End: ${formatMood(hoveredPoint.moodEnd)}`}
            </text>
            {hoveredPoint.notes ? (
              <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize="12" fill="#ffffff">
                {`Notes: ${hoveredPoint.notes}`}
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
