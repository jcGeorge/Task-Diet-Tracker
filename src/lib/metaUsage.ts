import type { AppData, MetaListKey } from "../types";

export function getMetaItemUsageCount(data: AppData, listKey: MetaListKey, itemId: string): number {
  switch (listKey) {
    case "workouts":
      return data.trackers.workouts.filter((entry) => entry.activities.some((activity) => activity.metaId === itemId)).length;
    case "subjects":
      return data.trackers.homework.filter((entry) => entry.subjectId === itemId).length;
    case "children":
      return data.trackers.homework.filter((entry) => entry.childId === itemId).length;
    case "chores":
      return data.trackers.cleaning.filter((entry) => entry.choreIds.includes(itemId)).length;
    case "substances":
      return data.trackers.substances.filter((entry) => entry.substanceIds.includes(itemId)).length;
    case "entertainment":
      return data.trackers.entertainment.filter((entry) => entry.activities.some((activity) => activity.metaId === itemId)).length;
    default:
      return 0;
  }
}
