import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EntertainmentEntry, MetaItem, ThemeMode } from "../types";

interface EntertainmentCompositionChartProps {
  entries: EntertainmentEntry[];
  entertainment: MetaItem[];
  theme: ThemeMode;
}

type EntertainmentChartStyle = "donut" | "pie";

interface EntertainmentTotal {
  id: string;
  name: string;
  minutes: number;
}

interface SlicePoint {
  item: EntertainmentTotal;
  startAngle: number;
  endAngle: number;
  percentage: number;
  midAngle: number;
  color: string;
}

const STORAGE_KEY = "task-diet-tracker.entertainment-chart-style";
const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const CENTER_X = CHART_WIDTH / 2;
const CENTER_Y = CHART_HEIGHT / 2 + 4;
const OUTER_RADIUS = 130;
const INNER_RADIUS_DONUT = 68;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 70;
const SLICE_COLORS_DARK = [
  "#f2d146",
  "#f28f2e",
  "#dc3545",
  "#7f5af0",
  "#198754",
  "#0d6efd",
  "#20c997",
  "#ff6b6b",
  "#6f42c1",
  "#17a2b8",
  "#fd7e14",
  "#9acd32",
  "#e83e8c",
  "#3f8efc",
  "#ff9f1c",
  "#5c7cfa"
];
const SLICE_COLORS_LIGHT = [
  "#d39e00",
  "#d97706",
  "#c1121f",
  "#5b3cc4",
  "#13795b",
  "#1459d9",
  "#0f766e",
  "#c44536",
  "#6d28d9",
  "#0b7285",
  "#b45309",
  "#5b8f1a",
  "#b83280",
  "#1d4ed8",
  "#b95f13",
  "#4c51bf"
];
const FULL_CIRCLE_EPSILON = 0.001;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const MINUTES_PER_YEAR = 365 * MINUTES_PER_DAY;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number): { x: number; y: number } {
  const radians = toRadians(angleDegrees);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDuration(totalMinutes: number): string {
  let remaining = Math.max(0, Math.round(totalMinutes));
  const years = Math.floor(remaining / MINUTES_PER_YEAR);
  remaining -= years * MINUTES_PER_YEAR;
  const weeks = Math.floor(remaining / MINUTES_PER_WEEK);
  remaining -= weeks * MINUTES_PER_WEEK;
  const days = Math.floor(remaining / MINUTES_PER_DAY);
  remaining -= days * MINUTES_PER_DAY;
  const hours = Math.floor(remaining / MINUTES_PER_HOUR);
  remaining -= hours * MINUTES_PER_HOUR;
  const minutes = remaining;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }
  if (weeks > 0) {
    parts.push(`${weeks} ${weeks === 1 ? "week" : "weeks"}`);
  }
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(", ");
}

function readSavedChartStyle(): EntertainmentChartStyle {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "pie" || raw === "donut") {
      return raw;
    }
  } catch {
    // Ignore localStorage failures.
  }
  return "pie";
}

function makePiePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 360 - FULL_CIRCLE_EPSILON) {
    return `M ${cx} ${cy} m ${radius} 0 A ${radius} ${radius} 0 1 0 ${-2 * radius} 0 A ${radius} ${radius} 0 1 0 ${2 * radius} 0 Z`;
  }

  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function makeDonutPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 360 - FULL_CIRCLE_EPSILON) {
    return `M ${cx} ${cy} m ${outerRadius} 0 A ${outerRadius} ${outerRadius} 0 1 0 ${-2 * outerRadius} 0 A ${outerRadius} ${outerRadius} 0 1 0 ${2 * outerRadius} 0 M ${cx} ${cy} m ${innerRadius} 0 A ${innerRadius} ${innerRadius} 0 1 1 ${-2 * innerRadius} 0 A ${innerRadius} ${innerRadius} 0 1 1 ${2 * innerRadius} 0`;
  }

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z"
  ].join(" ");
}

export function EntertainmentCompositionChart({ entries, entertainment, theme }: EntertainmentCompositionChartProps) {
  const [chartStyle, setChartStyle] = useState<EntertainmentChartStyle>(() => readSavedChartStyle());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const sliceColors = theme === "light" ? SLICE_COLORS_LIGHT : SLICE_COLORS_DARK;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, chartStyle);
    } catch {
      // Ignore localStorage failures.
    }
  }, [chartStyle]);

  const totals = useMemo<EntertainmentTotal[]>(() => {
    const namesById = new Map<string, string>(entertainment.map((item) => [item.id, item.name]));
    const totalsById = new Map<string, number>();

    for (const entry of entries) {
      for (const activity of entry.activities) {
        if (!Number.isFinite(activity.minutes) || activity.minutes <= 0 || !namesById.has(activity.metaId)) {
          continue;
        }
        totalsById.set(activity.metaId, (totalsById.get(activity.metaId) ?? 0) + activity.minutes);
      }
    }

    return [...totalsById.entries()]
      .map(([id, minutes]) => ({
        id,
        name: namesById.get(id) ?? "Unknown item",
        minutes
      }))
      .sort((left, right) => right.minutes - left.minutes || left.name.localeCompare(right.name));
  }, [entries, entertainment]);

  const totalMinutes = useMemo(() => totals.reduce((sum, item) => sum + item.minutes, 0), [totals]);

  const slices = useMemo<SlicePoint[]>(() => {
    if (totalMinutes <= 0) {
      return [];
    }

    let currentAngle = -90;
    return totals.map((item, index) => {
      const ratio = item.minutes / totalMinutes;
      const sweep = ratio * 360;
      const startAngle = currentAngle;
      currentAngle += sweep;
      const endAngle = currentAngle;
      return {
        item,
        startAngle,
        endAngle,
        percentage: ratio * 100,
        midAngle: (startAngle + endAngle) / 2,
        color: sliceColors[index % sliceColors.length]
      };
    });
  }, [totals, totalMinutes, sliceColors]);

  if (entertainment.length === 0) {
    return (
      <div className="mb-0">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0">Entertainment Chart</h2>
        </div>
        <p className="text-secondary mb-2">Add entertainment options in Metadata to render this chart.</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  if (totalMinutes <= 0 || slices.length === 0) {
    return (
      <div className="mb-0">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0">Entertainment Chart</h2>
          <button
            className="btn btn-sm btn-outline-secondary"
            type="button"
            onClick={() => setChartStyle((current) => (current === "donut" ? "pie" : "donut"))}
          >
            {chartStyle === "donut" ? "Make it a Pie" : "Make it a Donut"}
          </button>
        </div>
        <p className="text-secondary mb-0">No entertainment entries yet.</p>
      </div>
    );
  }

  const innerRadius = chartStyle === "donut" ? INNER_RADIUS_DONUT : 0;
  const getTooltipPointForSlice = (slice: SlicePoint): { x: number; y: number } => {
    const tooltipRadius = chartStyle === "donut" ? (OUTER_RADIUS + innerRadius) / 2 : OUTER_RADIUS * 0.62;
    return polarToCartesian(CENTER_X, CENTER_Y, tooltipRadius, slice.midAngle);
  };

  const handleSliceHoverStart = (slice: SlicePoint) => {
    setHoveredItemId(slice.item.id);
    setTooltipAnchor(getTooltipPointForSlice(slice));
  };

  const handleSliceHoverEnd = () => {
    setHoveredItemId(null);
    setTooltipAnchor(null);
  };

  const activeSlice = hoveredItemId ? slices.find((slice) => slice.item.id === hoveredItemId) ?? null : null;

  const tooltip = activeSlice && tooltipAnchor
    ? {
        x: clamp(tooltipAnchor.x + 10, 12, CHART_WIDTH - TOOLTIP_WIDTH - 12),
        y: clamp(tooltipAnchor.y - TOOLTIP_HEIGHT - 8, 12, CHART_HEIGHT - TOOLTIP_HEIGHT - 12)
      }
    : null;

  return (
    <div className="workouts-composition-wrap">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
        <h2 className="h5 mb-0">Entertainment Chart</h2>
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          onClick={() => setChartStyle((current) => (current === "donut" ? "pie" : "donut"))}
        >
          {chartStyle === "donut" ? "Make it a Pie" : "Make it a Donut"}
        </button>
      </div>

      <svg
        className="workouts-composition-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Entertainment composition chart"
      >
        {slices.map((slice) => {
          const sweep = slice.endAngle - slice.startAngle;
          const singleSlice = slices.length === 1 && sweep >= 360 - FULL_CIRCLE_EPSILON;
          const isActive = hoveredItemId === slice.item.id;
          const isMuted = hoveredItemId !== null && !isActive;
          const fillOpacity = isMuted ? 0.36 : 0.96;
          const stroke = isActive ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.22)";
          const strokeWidth = isActive ? 3 : 1;

          if (chartStyle === "pie") {
            return singleSlice ? (
              <circle
                key={slice.item.id}
                cx={CENTER_X}
                cy={CENTER_Y}
                r={OUTER_RADIUS}
                fill={slice.color}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeWidth={strokeWidth}
                onMouseEnter={() => handleSliceHoverStart(slice)}
                onMouseLeave={handleSliceHoverEnd}
              />
            ) : (
              <path
                key={slice.item.id}
                d={makePiePath(CENTER_X, CENTER_Y, OUTER_RADIUS, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeWidth={strokeWidth}
                onMouseEnter={() => handleSliceHoverStart(slice)}
                onMouseLeave={handleSliceHoverEnd}
              />
            );
          }

          return singleSlice ? (
            <circle
              key={slice.item.id}
              cx={CENTER_X}
              cy={CENTER_Y}
              r={(OUTER_RADIUS + innerRadius) / 2}
              fill="none"
              stroke={slice.color}
              strokeWidth={OUTER_RADIUS - innerRadius}
              opacity={fillOpacity}
              onMouseEnter={() => handleSliceHoverStart(slice)}
              onMouseLeave={handleSliceHoverEnd}
            />
          ) : (
            <path
              key={slice.item.id}
              d={makeDonutPath(CENTER_X, CENTER_Y, OUTER_RADIUS, innerRadius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              fillOpacity={fillOpacity}
              fillRule="evenodd"
              stroke={stroke}
              strokeWidth={strokeWidth}
              onMouseEnter={() => handleSliceHoverStart(slice)}
              onMouseLeave={handleSliceHoverEnd}
            />
          );
        })}

        {tooltip && activeSlice ? (
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
              {activeSlice.item.name}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="#fff2bf">
              {`Time: ${formatDuration(activeSlice.item.minutes)}`}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize="12" fill="#d8f5ff">
              {`Share: ${formatNumber(activeSlice.percentage)}%`}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="workouts-chart-legend mt-3">
        {slices.map((slice) => {
          const isActive = hoveredItemId === slice.item.id;
          return (
            <button
              key={`legend-${slice.item.id}`}
              className={`btn btn-sm btn-secondary workout-legend-btn${isActive ? " workout-legend-btn-active" : ""}`}
              type="button"
              onMouseEnter={() => handleSliceHoverStart(slice)}
              onMouseLeave={handleSliceHoverEnd}
            >
              <span className="workout-legend-swatch" style={{ backgroundColor: slice.color }} />
              <span className="small fw-semibold">{slice.item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
