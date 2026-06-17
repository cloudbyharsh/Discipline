import { HABIT_OPTIONS } from "@/lib/constants";
import type { Habit } from "@/types/database";

/** The user-facing label for a workflow: its custom name, else the preset habit label. */
export function getHabitDisplayName(habit: Habit): string {
  if (habit.name && habit.name.trim().length > 0) return habit.name;
  if (habit.habit_type === "custom" && habit.custom_name) return habit.custom_name;
  return HABIT_OPTIONS.find((h) => h.value === habit.habit_type)?.label ?? "Untitled";
}
