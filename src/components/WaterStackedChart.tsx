import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { displayDateToIso } from "../lib/date";

interface WaterStackedEntry {
  id: string;
  date: string;
  liters: number;
}

interface WaterStackedChartProps {
  entries: WaterStackedEntry[];
  threshold: number | null;
}

interface DailySegment {
  id: string;
  liters: number;
}

interface DailyGroup {
  date: string;
  isoDate: string;
  totalLiters: number;
  segments: DailySegment[];
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 270;
const BASE_TOOLTIP_HEIGHT = 56;
const BELOW_GOAL_COLORS = ["#dc3545", "#fd7e14", "#ffd24a"];
const AT_OR_ABOVE_GOAL_COLORS = ["#198754", "#0d6efd", "#9a66d8"];

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

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildDailyGroups(entries: WaterStackedEntry[]): DailyGroup[] {
  const groups = new Map<string, DailyGroup>();

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const isoDate = displayDateToIso(entry.date);
    if (!isoDate) {
      continue;
    }

    const existing = groups.get(isoDate);
    if (!existing) {
      groups.set(isoDate, {
        date: entry.date,
        isoDate,
        totalLiters: entry.liters,
        segments: [{ id: entry.id, liters: entry.liters }]
      });
      continue;
    }

    existing.totalLiters += entry.liters;
    existing.segments.push({ id: entry.id, liters: entry.liters });
  }

  return [...groups.values()].sort((left, right) => left.isoDate.localeCompare(right.isoDate));
}

export function WaterStackedChart({ entries, threshold }: WaterStackedChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<{
    x: number;
    y: number;
    date: string;
    liters: number;
  } | null>(null);

  const dailyGroups = useMemo(() => buildDailyGroups(entries), [entries]);

  if (threshold === null) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-2">Water Goal Per Day is required to render this chart.</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  if (dailyGroups.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-0">No entries yet.</p>
      </div>
    );
  }

  const maxValue = Math.max(threshold, ...dailyGroups.map((group) => group.totalLiters), 1);
  const step = buildStep(maxValue);
  const yMax = Math.ceil(maxValue / step) * step;
  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, index) => index * step);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(dailyGroups.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 16, 72);
  const thresholdY = PADDING.top + plotHeight - (threshold / yMax) * plotHeight;

  const tooltipHeight = BASE_TOOLTIP_HEIGHT;
  const tooltip = hoveredSegment
    ? {
        x: clamp(hoveredSegment.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredSegment.y - tooltipHeight - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - tooltipHeight - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <h2 className="h5 mb-3">Water Chart</h2>
      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Water stacked bar chart"
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={`tick-${tick}`}>
              <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(127,127,127,0.24)" />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {formatNumber(tick)}
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
          stroke="#198754"
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {dailyGroups.map((group, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          let runningLiters = 0;
          const segmentPalette = group.totalLiters < threshold ? BELOW_GOAL_COLORS : AT_OR_ABOVE_GOAL_COLORS;

          return (
            <g key={group.isoDate}>
              {group.segments.map((segment, segmentIndex) => {
                const startLiters = runningLiters;
                runningLiters += segment.liters;
                const yTop = PADDING.top + plotHeight - (runningLiters / yMax) * plotHeight;
                const yBottom = PADDING.top + plotHeight - (startLiters / yMax) * plotHeight;
                const height = Math.max(yBottom - yTop, 1);
                const color = segmentPalette[segmentIndex % segmentPalette.length];

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
                        liters: segment.liters
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
              height={tooltipHeight}
              rx={6}
              ry={6}
              fill="var(--graph-tooltip-bg)"
              stroke="var(--graph-tooltip-border)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="var(--graph-tooltip-text)">
              {hoveredSegment.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="var(--graph-tooltip-accent-1)">
              {`Water: ${formatNumber(hoveredSegment.liters)} L`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
