import type { CarbsEntry } from "../types";

interface CarbsByDateListProps {
  date: string;
  entries: CarbsEntry[];
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function CarbsByDateList({ date, entries }: CarbsByDateListProps) {
  const entriesForDate = entries.filter((entry) => entry.date === date);
  const totalCarbs = entriesForDate.reduce((sum, entry) => sum + entry.carbs, 0);

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body">
        <h2 className="h6 mb-2">Carbs Logged For {date}</h2>
        {entriesForDate.length === 0 ? (
          <p className="mb-0 text-secondary">No carb entries for this date yet.</p>
        ) : (
          <>
            <p className="fw-semibold mb-2">Total Carbs: {formatNumber(totalCarbs)}</p>
            <ul className="list-group list-group-flush">
              {entriesForDate.map((entry) => (
                <li key={entry.id} className="list-group-item px-0 py-2 calories-sub-item">
                  <div className="fw-semibold">Carbs: {formatNumber(entry.carbs)}</div>
                  {entry.notes ? <div className="small text-secondary">Notes: {entry.notes}</div> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
