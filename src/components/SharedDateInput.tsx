import { displayDateToIso, isDisplayDate, isoToDisplayDate } from "../lib/date";

interface SharedDateInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  required?: boolean;
}

export function SharedDateInput({ id, label, value, onChange, required = false }: SharedDateInputProps) {
  const inputValue = isDisplayDate(value) ? displayDateToIso(value) : "";

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control shared-date-input"
        type="date"
        value={inputValue}
        required={required}
        onChange={(event) => onChange(isoToDisplayDate(event.target.value))}
      />
    </div>
  );
}
