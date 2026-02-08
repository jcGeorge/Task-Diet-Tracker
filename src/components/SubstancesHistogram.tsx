import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MetaItem, SubstanceEntry } from "../types";

interface SubstancesHistogramProps {
  entries: SubstanceEntry[];
  substances: MetaItem[];
}

interface HistogramPoint {
  id: string;
  name: string;
  count: number;
}

const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 88, left: 56 };
const BAR_COLORS = ["#f2d146", "#f28f2e", "#dc3545", "#7f5af0"];
const Y_STEPS = [5, 10, 25, 50];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chooseStep(maxCount: number): number {
  if (maxCount <= 0) {
    return 5;
  }
  for (const candidate of Y_STEPS) {
    if (Math.ceil(maxCount / candidate) <= 10) {
      return candidate;
    }
  }
  return 50;
}

export function SubstancesHistogram({ entries, substances }: SubstancesHistogramProps) {
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; name: string; count: number } | null>(null);

  const points = useMemo<HistogramPoint[]>(() => {
    const sortedSubstances = [...substances].sort((left, right) => left.name.localeCompare(right.name));
    if (sortedSubstances.length === 0) {
      return [];
    }

    const countById = new Map<string, number>(sortedSubstances.map((item) => [item.id, 0]));
    const dateUsageMap = new Map<string, Set<string>>();

    for (const entry of entries) {
      const usageSet = dateUsageMap.get(entry.date) ?? new Set<string>();
      for (const substanceId of entry.substanceIds) {
        if (countById.has(substanceId)) {
          usageSet.add(substanceId);
        }
      }
      dateUsageMap.set(entry.date, usageSet);
    }

    for (const usageSet of dateUsageMap.values()) {
      for (const substanceId of usageSet) {
        countById.set(substanceId, (countById.get(substanceId) ?? 0) + 1);
      }
    }

    return sortedSubstances.map((item) => ({
      id: item.id,
      name: item.name,
      count: countById.get(item.id) ?? 0
    }));
  }, [entries, substances]);

  if (substances.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-2">Add substance options in Metadata to render this graph.</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  const maxCount = Math.max(...points.map((point) => point.count), 0);
  const step = chooseStep(maxCount);
  const yMax = Math.max(step, Math.ceil(maxCount / step) * step);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 16, 72);

  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, index) => index * step);

  const tooltip = hoveredBar
    ? {
        x: clamp(hoveredBar.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - 186),
        y: clamp(hoveredBar.y - 56, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - 58)
      }
    : null;

  return (
    <div className="substances-histogram-wrap">
      <svg
        className="substances-histogram-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Substances usage histogram"
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={`substances-y-${tick}`}>
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
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const barHeight = point.count <= 0 ? 0 : (point.count / yMax) * plotHeight;
          const y = PADDING.top + plotHeight - barHeight;
          const barColor = BAR_COLORS[index % BAR_COLORS.length];
          return (
            <g key={point.id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill={barColor}
                opacity={0.92}
                rx={3}
                ry={3}
                onMouseEnter={() => setHoveredBar({ x: x + barWidth / 2, y, name: point.name, count: point.count })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT - PADDING.bottom + 16}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
              >
                {point.name}
              </text>
            </g>
          );
        })}

        {hoveredBar && tooltip ? (
          <g pointerEvents="none">
            <rect x={tooltip.x} y={tooltip.y} width={182} height={52} rx={6} ry={6} fill="var(--graph-tooltip-bg)" stroke="var(--graph-tooltip-border)" />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="var(--graph-tooltip-text)">
              {hoveredBar.name}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="var(--graph-tooltip-accent-1)">
              {`Uses: ${hoveredBar.count}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

