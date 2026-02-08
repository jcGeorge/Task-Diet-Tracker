import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { displayDateToIso } from "../lib/date";

interface ThresholdBarChartEntry {
  id: string;
  date: string;
  value: number;
}

interface ThresholdBarChartProps {
  title: string;
  entries: ThresholdBarChartEntry[];
  threshold: number | null;
  thresholdLabel: string;
  valueLabel: string;
  formatWithCommas?: boolean;
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 186;
const TOOLTIP_HEIGHT = 52;

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

function formatValue(value: number, useCommas: boolean): string {
  if (!useCommas) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

export function ThresholdBarChart({
  title,
  entries,
  threshold,
  thresholdLabel,
  valueLabel,
  formatWithCommas = false
}: ThresholdBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

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

  if (threshold === null) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-2">{thresholdLabel} is required to render this chart.</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  if (sortedEntries.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-0">No entries yet.</p>
      </div>
    );
  }

  const maxValue = Math.max(threshold, ...sortedEntries.map((entry) => entry.value), 1);
  const step = buildStep(maxValue);
  const yMax = Math.ceil(maxValue / step) * step;
  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, index) => index * step);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(sortedEntries.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 14, 58);

  const thresholdY = PADDING.top + plotHeight - (threshold / yMax) * plotHeight;

  const tooltip = hoveredBar
    ? {
        x: clamp(hoveredBar.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredBar.y - TOOLTIP_HEIGHT - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - TOOLTIP_HEIGHT - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <h2 className="h5 mb-3">{title}</h2>
      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${title} bar chart`}
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={`tick-${tick}`}>
              <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(127,127,127,0.24)" />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {formatWithCommas ? formatValue(tick, true) : tick}
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

        <line
          x1={PADDING.left}
          y1={thresholdY}
          x2={CHART_WIDTH - PADDING.right}
          y2={thresholdY}
          stroke="#dc3545"
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {sortedEntries.map((entry, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const barHeight = (entry.value / yMax) * plotHeight;
          const y = PADDING.top + plotHeight - barHeight;
          const fill =
            Math.abs(entry.value - threshold) < 0.000001
              ? "#6c757d"
              : entry.value < threshold
                ? "#198754"
                : "#dc3545";
          return (
            <g key={entry.id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill={fill}
                opacity={0.92}
                rx={3}
                ry={3}
                onMouseEnter={() => setHoveredBar({ x: x + barWidth / 2, y, date: entry.date, value: entry.value })}
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
              fill="var(--graph-tooltip-bg)"
              stroke="var(--graph-tooltip-border)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="var(--graph-tooltip-text)">
              {hoveredBar.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="var(--graph-tooltip-accent-2)">
              {`${valueLabel}: ${formatValue(hoveredBar.value, formatWithCommas)}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

