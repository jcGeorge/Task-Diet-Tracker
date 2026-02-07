import type { CaloriesEntry } from "../types";

interface CaloriesByDateListProps {
  date: string;
  entries: CaloriesEntry[];
}

export function CaloriesByDateList({ date, entries }: CaloriesByDateListProps) {
  const entriesForDate = entries.filter((entry) => entry.date === date);

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body">
        <h2 className="h6 mb-2">Calories Logged For {date}</h2>
        {entriesForDate.length === 0 ? (
          <p className="mb-0 text-secondary">No calorie entries for this date yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {entriesForDate.map((entry) => (
              <li key={entry.id} className="list-group-item px-0 py-2 calories-sub-item">
                <div className="fw-semibold">Calories: {entry.calories}</div>
                {entry.notes ? <div className="small text-secondary">Notes: {entry.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
