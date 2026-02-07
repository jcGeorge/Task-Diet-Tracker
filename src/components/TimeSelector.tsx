import type { TimeParts } from "../lib/time";

interface TimeSelectorProps {
  idPrefix: string;
  label: string;
  value: TimeParts;
  onChange: (next: TimeParts) => void;
}

export function TimeSelector({ idPrefix, label, value, onChange }: TimeSelectorProps) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold" htmlFor={`${idPrefix}-hour`}>
        {label}
      </label>
      <div className="d-flex align-items-center gap-2 shared-time-input">
        <select
          id={`${idPrefix}-hour`}
          className="form-select time-select-box"
          value={value.hour}
          onChange={(event) => onChange({ ...value, hour: event.target.value })}
        >
          <option value="">Hour</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hourValue) => (
            <option key={`${idPrefix}-hour-${hourValue}`} value={hourValue}>
              {hourValue}
            </option>
          ))}
        </select>

        <span className="fw-semibold time-select-separator">:</span>

        <select
          id={`${idPrefix}-minute`}
          className="form-select time-select-box"
          value={value.minute}
          onChange={(event) => onChange({ ...value, minute: event.target.value })}
        >
          <option value="">Min</option>
          {["00", "15", "30", "45"].map((minuteValue) => (
            <option key={`${idPrefix}-minute-${minuteValue}`} value={minuteValue}>
              {minuteValue}
            </option>
          ))}
        </select>

        <select
          id={`${idPrefix}-meridiem`}
          className="form-select time-select-box"
          value={value.meridiem}
          onChange={(event) => onChange({ ...value, meridiem: event.target.value as TimeParts["meridiem"] })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
