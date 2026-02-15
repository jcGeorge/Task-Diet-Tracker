import type { WaterEntry } from "../types";

interface WaterByDateListProps {
  date: string;
  entries: WaterEntry[];
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function WaterByDateList({ date, entries }: WaterByDateListProps) {
  const entriesForDate = entries.filter((entry) => entry.date === date);
  const totalLiters = entriesForDate.reduce((sum, entry) => sum + entry.liters, 0);

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body">
        <h2 className="h6 mb-2">Water Logged For {date}</h2>
        {entriesForDate.length === 0 ? (
          <p className="mb-0 text-secondary">No water entries for this date yet.</p>
        ) : (
          <>
            <p className="fw-semibold mb-2">Total Water: {formatNumber(totalLiters)} L</p>
            <ul className="list-group list-group-flush">
              {entriesForDate.map((entry) => (
                <li key={entry.id} className="list-group-item px-0 py-2 calories-sub-item">
                  <div className="fw-semibold">Water: {formatNumber(entry.liters)} L</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
