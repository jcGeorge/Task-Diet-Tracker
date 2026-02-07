import { displayDateToIso, isDisplayDate, isoToDisplayDate } from "../lib/date";

interface SharedDateInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  required?: boolean;
  allowDayStepper?: boolean;
}

function shiftDisplayDate(value: string, deltaDays: number): string {
  const iso = displayDateToIso(value);
  if (!iso) {
    return value;
  }

  const [year, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  const nextIso = [
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

  return isoToDisplayDate(nextIso);
}

export function SharedDateInput({
  id,
  label,
  value,
  onChange,
  required = false,
  allowDayStepper = false
}: SharedDateInputProps) {
  const inputValue = isDisplayDate(value) ? displayDateToIso(value) : "";

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold" htmlFor={id}>
        {label}
      </label>
      <div className="d-flex align-items-center gap-2 shared-date-input-row">
        <input
          id={id}
          className="form-control shared-date-input"
          type="date"
          value={inputValue}
          required={required}
          onChange={(event) => onChange(isoToDisplayDate(event.target.value))}
        />

        {allowDayStepper ? (
          <>
            <button
              type="button"
              className="btn btn-outline-secondary shared-date-nav-btn"
              aria-label="Previous day"
              onClick={() => onChange(shiftDisplayDate(value, -1))}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary shared-date-nav-btn"
              aria-label="Next day"
              onClick={() => onChange(shiftDisplayDate(value, 1))}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
