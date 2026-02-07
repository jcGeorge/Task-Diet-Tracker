import { useMemo, useState } from "react";
import { displayDateToIso } from "../lib/date";
import type { FastingEntry } from "../types";

interface FastingBarChartProps {
  entries: FastingEntry[];
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 186;
const TOOLTIP_HEIGHT = 52;
const Y_MAX = 24;
const Y_TICK_STEP = 4;

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

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

export function FastingBarChart({ entries }: FastingBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; date: string; hours: number } | null>(null);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((left, right) => {
        const leftIso = displayDateToIso(left.date);
        const rightIso = displayDateToIso(right.date);
        if (leftIso === rightIso) {
          return left.id.localeCompare(right.id);
        }
        return leftIso.localeCompare(rightIso);
      }),
    [entries]
  );

  if (sortedEntries.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-0">No entries yet.</p>
      </div>
    );
  }

  const yTicks = Array.from({ length: Math.floor(Y_MAX / Y_TICK_STEP) + 1 }, (_, index) => index * Y_TICK_STEP);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(sortedEntries.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 14, 58);

  const tooltip = hoveredBar
    ? {
        x: clamp(hoveredBar.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredBar.y - TOOLTIP_HEIGHT - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - TOOLTIP_HEIGHT - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <h2 className="h5 mb-3">Fasting Chart</h2>
      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Fasting hours bar chart"
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / Y_MAX) * plotHeight;
          return (
            <g key={`fasting-tick-${tick}`}>
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

        {sortedEntries.map((entry, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const clampedHours = clamp(entry.hours, 0, Y_MAX);
          const barHeight = (clampedHours / Y_MAX) * plotHeight;
          const y = PADDING.top + plotHeight - barHeight;
          return (
            <g key={entry.id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill="#198754"
                opacity={0.92}
                rx={3}
                ry={3}
                onMouseEnter={() => setHoveredBar({ x: x + barWidth / 2, y, date: entry.date, hours: entry.hours })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <text x={x + barWidth / 2} y={CHART_HEIGHT - PADDING.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor">
                {formatDate(entry.date)}
              </text>
            </g>
          );
        })}

        {hoveredBar && tooltip ? (
          <g pointerEvents="none">
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width={TOOLTIP_WIDTH}
              height={TOOLTIP_HEIGHT}
              rx={6}
              ry={6}
              fill="rgba(23, 28, 34, 0.92)"
              stroke="rgba(255,255,255,0.2)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="#ffffff">
              {hoveredBar.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="#d7f7e5">
              {`Hours: ${formatHours(hoveredBar.hours)}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
