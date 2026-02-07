import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { displayDateToIso } from "../lib/date";
import type { MetaItem } from "../types";

interface HomeworkStackedEntry {
  id: string;
  date: string;
  minutes: number;
  notes: string;
  studentId: string;
  subjectName: string;
}

interface HomeworkStackedChartProps {
  entries: HomeworkStackedEntry[];
  students: MetaItem[];
}

interface DailySegment {
  id: string;
  minutes: number;
  notes: string;
  subjectName: string;
}

interface DailyGroup {
  date: string;
  isoDate: string;
  totalMinutes: number;
  segments: DailySegment[];
}

const STORAGE_KEY = "task-diet-tracker.homework-chart-student-id";
const CHART_WIDTH = 920;
const CHART_HEIGHT = 360;
const PADDING = { top: 20, right: 24, bottom: 68, left: 56 };
const TOOLTIP_WIDTH = 320;
const BASE_TOOLTIP_HEIGHT = 56;
const SEGMENT_COLORS = ["#198754", "#0d6efd", "#20c997", "#6f42c1", "#4dabf7", "#5c7cfa"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readSavedStudentId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
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

function buildDailyGroups(entries: HomeworkStackedEntry[]): DailyGroup[] {
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
        totalMinutes: entry.minutes,
        segments: [{ id: entry.id, minutes: entry.minutes, notes: entry.notes, subjectName: entry.subjectName }]
      });
      continue;
    }

    existing.totalMinutes += entry.minutes;
    existing.segments.push({ id: entry.id, minutes: entry.minutes, notes: entry.notes, subjectName: entry.subjectName });
  }

  return [...groups.values()].sort((left, right) => left.isoDate.localeCompare(right.isoDate));
}

export function HomeworkStackedChart({ entries, students }: HomeworkStackedChartProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => readSavedStudentId());
  const [hoveredSegment, setHoveredSegment] = useState<{
    x: number;
    y: number;
    date: string;
    minutes: number;
    notes: string;
    subjectName: string;
  } | null>(null);

  useEffect(() => {
    if (students.length === 0) {
      return;
    }

    if (selectedStudentId && students.some((student) => student.id === selectedStudentId)) {
      return;
    }

    setSelectedStudentId(students[0].id);
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, selectedStudentId);
    } catch {
      // Ignore localStorage failures.
    }
  }, [selectedStudentId]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.studentId === selectedStudentId),
    [entries, selectedStudentId]
  );
  const dailyGroups = useMemo(() => buildDailyGroups(filteredEntries), [filteredEntries]);

  if (students.length === 0) {
    return (
      <div className="mb-0">
        <p className="text-secondary mb-2">Add students in Metadata to render this chart.</p>
        <Link className="btn btn-primary btn-sm" to="/settings/meta">
          Open Metadata
        </Link>
      </div>
    );
  }

  const selectedStudentName = students.find((student) => student.id === selectedStudentId)?.name ?? "Unknown student";

  if (dailyGroups.length === 0) {
    return (
      <div className="mb-0">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h2 className="h5 mb-0">Homework Chart</h2>
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="homework-chart-student" className="form-label fw-semibold mb-0">
              Student
            </label>
            <select
              id="homework-chart-student"
              className="form-select homework-chart-student-select"
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-secondary mb-0">No homework entries yet for {selectedStudentName}.</p>
      </div>
    );
  }

  const maxValue = Math.max(...dailyGroups.map((group) => group.totalMinutes), 1);
  const step = buildStep(maxValue);
  const yMax = Math.ceil(maxValue / step) * step;
  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, index) => index * step);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = plotWidth / Math.max(dailyGroups.length, 1);
  const barWidth = clamp(slotWidth * 0.62, 16, 72);

  const tooltipLineCount = hoveredSegment ? (hoveredSegment.notes ? 4 : 3) : 2;
  const tooltipHeight = BASE_TOOLTIP_HEIGHT + (tooltipLineCount - 2) * 18;
  const tooltip = hoveredSegment
    ? {
        x: clamp(hoveredSegment.x + 10, PADDING.left + 4, CHART_WIDTH - PADDING.right - TOOLTIP_WIDTH - 4),
        y: clamp(hoveredSegment.y - tooltipHeight - 8, PADDING.top + 4, CHART_HEIGHT - PADDING.bottom - tooltipHeight - 4)
      }
    : null;

  return (
    <div className="threshold-chart-wrap">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="h5 mb-0">Homework Chart</h2>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="homework-chart-student" className="form-label fw-semibold mb-0">
            Student
          </label>
          <select
            id="homework-chart-student"
            className="form-select homework-chart-student-select"
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <svg
        className="threshold-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Homework stacked bar chart for ${selectedStudentName}`}
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={`homework-tick-${tick}`}>
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

        {dailyGroups.map((group, index) => {
          const x = PADDING.left + index * slotWidth + (slotWidth - barWidth) / 2;
          let runningMinutes = 0;

          return (
            <g key={group.isoDate}>
              {group.segments.map((segment, segmentIndex) => {
                const startMinutes = runningMinutes;
                runningMinutes += segment.minutes;
                const yTop = PADDING.top + plotHeight - (runningMinutes / yMax) * plotHeight;
                const yBottom = PADDING.top + plotHeight - (startMinutes / yMax) * plotHeight;
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
                        minutes: segment.minutes,
                        notes: segment.notes,
                        subjectName: segment.subjectName
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
              fill="rgba(23, 28, 34, 0.92)"
              stroke="rgba(255,255,255,0.2)"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 20} fontSize="12" fill="#ffffff">
              {hoveredSegment.date}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 38} fontSize="12" fill="#fff2bf">
              {`Minutes: ${formatNumber(hoveredSegment.minutes)}`}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize="12" fill="#d8f5ff">
              {`Subject: ${hoveredSegment.subjectName || "(unset)"}`}
            </text>
            {hoveredSegment.notes ? (
              <text x={tooltip.x + 10} y={tooltip.y + 74} fontSize="12" fill="#ffffff">
                {`Notes: ${hoveredSegment.notes}`}
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
