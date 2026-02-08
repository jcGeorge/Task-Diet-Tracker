import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SharedDateInput } from "../components/SharedDateInput";
import { useAppData } from "../context/AppDataContext";
import { isDisplayDate } from "../lib/date";
import { getMetaItemUsageCount } from "../lib/metaUsage";
import { metaLabels, type MetaListKey } from "../types";

type Notice = { tone: "success" | "danger"; message: string } | null;

const allMetaSections: MetaListKey[] = ["workouts", "subjects", "children", "chores", "substances", "entertainment"];
const singularLabels: Record<MetaListKey, string> = {
  workouts: "workout",
  subjects: "subject",
  children: "student",
  chores: "chore",
  substances: "substance",
  entertainment: "entertainment"
};

export function MetaPage() {
  const { data, updateSettings, addMetaItem, renameMetaItem, removeMetaItem } = useAppData();
  const [addDrafts, setAddDrafts] = useState<Record<MetaListKey, string>>({
    workouts: "",
    subjects: "",
    children: "",
    chores: "",
    substances: "",
    entertainment: ""
  });
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [isToastHovered, setIsToastHovered] = useState(false);
  const [hasToastBeenHovered, setHasToastBeenHovered] = useState(false);

  useEffect(() => {
    if (!notice) {
      setIsToastHovered(false);
      setHasToastBeenHovered(false);
      return;
    }

    if (isToastHovered) {
      return;
    }

    const timeoutMs = hasToastBeenHovered ? 3000 : 5000;
    const timer = window.setTimeout(() => {
      setNotice(null);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice, isToastHovered, hasToastBeenHovered]);

  const usageByItemId = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const listKey of allMetaSections) {
      for (const item of data.meta[listKey]) {
        usage[`${listKey}:${item.id}`] = getMetaItemUsageCount(data, listKey, item.id);
      }
    }
    return usage;
  }, [data]);

  const handleAdd = (listKey: MetaListKey) => {
    const nextName = addDrafts[listKey].trim();
    if (!nextName) {
      setNotice({ tone: "danger", message: "Name is required." });
      return;
    }

    const added = addMetaItem(listKey, nextName);
    if (!added) {
      setNotice({ tone: "danger", message: "Could not add item. It may already exist." });
      return;
    }

    setAddDrafts((previous) => ({ ...previous, [listKey]: "" }));
    setNotice({ tone: "success", message: `"${nextName}" added to ${metaLabels[listKey]}.` });
  };

  const handleRename = (listKey: MetaListKey, itemId: string, fallbackName: string) => {
    const key = `${listKey}:${itemId}`;
    const nextName = (editDrafts[key] ?? fallbackName).trim();
    const renamed = renameMetaItem(listKey, itemId, nextName);
    if (!renamed) {
      setNotice({ tone: "danger", message: "Rename failed. Name might be empty or duplicate." });
      return;
    }
    setNotice({ tone: "success", message: "Item renamed." });
  };

  const handleDelete = (listKey: MetaListKey, itemId: string) => {
    const result = removeMetaItem(listKey, itemId);
    if (!result.ok) {
      setNotice({ tone: "danger", message: result.reason ?? "Delete failed." });
      return;
    }
    setNotice({ tone: "success", message: "Item deleted." });
  };

  const parseDecimal = (raw: string): number | null => {
    if (raw.trim() === "") {
      return null;
    }
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  };

  const parseDecimalInRange = (raw: string, min: number, max: number): number | null => {
    if (raw.trim() === "") {
      return null;
    }
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      return null;
    }
    return parsed;
  };

  const renderMetaListEditor = (listKey: MetaListKey, headingClassName = "h6 mb-2") => (
    <>
      <h3 className={headingClassName}>{metaLabels[listKey]}</h3>
      <form
        className="d-flex gap-2 mb-3"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd(listKey);
        }}
      >
        <input
          className="form-control"
          placeholder={`Add ${singularLabels[listKey]}...`}
          value={addDrafts[listKey]}
          onChange={(event) =>
            setAddDrafts((previous) => ({ ...previous, [listKey]: event.target.value }))
          }
        />
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      {data.meta[listKey].length === 0 ? (
        <p className="text-secondary mb-0">No items yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {data.meta[listKey].map((item) => {
            const mapKey = `${listKey}:${item.id}`;
            const usageCount = usageByItemId[mapKey] ?? 0;
            return (
              <div key={item.id} className="meta-row">
                <input
                  className="form-control"
                  value={editDrafts[mapKey] ?? item.name}
                  onChange={(event) =>
                    setEditDrafts((previous) => ({
                      ...previous,
                      [mapKey]: event.target.value
                    }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleRename(listKey, item.id, item.name)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    if (usageCount > 0) {
                      setNotice({ tone: "danger", message: "This item is used by existing entries and cannot be deleted." });
                      return;
                    }
                    handleDelete(listKey, item.id);
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={`btn btn-sm meta-usage-btn ${usageCount > 0 ? "btn-warning" : "btn-secondary"}`}
                  disabled
                >
                  Used: {usageCount}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <section className="row g-3">
      <div className="col-12 col-xl-10 mx-auto">
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h1 className="h4 mb-0">Meta</h1>
              <Link className="btn btn-outline-secondary btn-sm" to="/settings">
                Back to Settings
              </Link>
            </div>
            <p className="text-secondary mb-0 mt-2">
              Manage list items used by Weight, Workouts and more.
            </p>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h5 mb-3">Diet Baseline</h2>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="meta-starting-weight" className="form-label fw-semibold">
                  Starting Weight (lbs)
                </label>
                <input
                  id="meta-starting-weight"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.startingWeightLbs ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      startingWeightLbs: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>

              <div className="col-12 col-md-6">
                <SharedDateInput
                  id="meta-diet-start-date"
                  label="Diet Start Date"
                  value={data.settings.dietStartDate ?? ""}
                  onChange={(nextDate) => {
                    updateSettings({
                      dietStartDate: isDisplayDate(nextDate) ? nextDate : null
                    });
                  }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="meta-weight-loss-per-week" className="form-label fw-semibold">
                  Weight Loss Per Week (lbs)
                </label>
                <input
                  id="meta-weight-loss-per-week"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.weightLossPerWeekLbs ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      weightLossPerWeekLbs: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="meta-weight-goal" className="form-label fw-semibold">
                  Weight Goal (lbs)
                </label>
                <input
                  id="meta-weight-goal"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.weightGoalLbs ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      weightGoalLbs: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 mb-3">Carb Limit Per Day</h2>
                <input
                  id="meta-carb-limit-per-day"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.carbLimitPerDay ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      carbLimitPerDay: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 mb-3">Calorie Limit Per Day</h2>
                <input
                  id="meta-calorie-limit-per-day"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.calorieLimitPerDay ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      calorieLimitPerDay: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 mb-3">Daily Steps Goal</h2>
                <input
                  id="meta-daily-steps-goal"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={data.settings.dailyStepsGoal ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      dailyStepsGoal: parseDecimal(event.target.value)
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 mb-3">Desired Rest (hours)</h2>
                <input
                  id="meta-desired-sleep-hours"
                  className="form-control shared-date-input"
                  type="number"
                  inputMode="decimal"
                  min="3"
                  max="12"
                  step="0.1"
                  value={data.settings.desiredSleepHours ?? ""}
                  onChange={(event) => {
                    updateSettings({
                      desiredSleepHours: parseDecimalInRange(event.target.value, 3, 12)
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">{renderMetaListEditor("workouts", "h5 mb-3")}</div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 mb-3">Homework</h2>
                {renderMetaListEditor("subjects")}
                <hr className="entry-form-divider my-2" />
                {renderMetaListEditor("children")}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">{renderMetaListEditor("chores", "h5 mb-3")}</div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">{renderMetaListEditor("substances", "h5 mb-3")}</div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">{renderMetaListEditor("entertainment", "h5 mb-3")}</div>
            </div>
          </div>
        </div>

        {notice ? (
          <div className="toast-container position-fixed bottom-0 end-0 p-3">
            <div
              className={`toast app-toast show align-items-center text-bg-${notice.tone} border-0`}
              role="status"
              aria-live="polite"
              onMouseEnter={() => {
                setIsToastHovered(true);
                setHasToastBeenHovered(true);
              }}
              onMouseLeave={() => {
                setIsToastHovered(false);
              }}
            >
              <div className="d-flex">
                <div className="toast-body">{notice.message}</div>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2 me-2 my-auto"
                  aria-label="Close"
                  onClick={() => setNotice(null)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
