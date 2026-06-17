import type { HabitType, GoalType, Mood, TriggerOption } from "@/types/database";

export const HABIT_OPTIONS: { value: HabitType; label: string }[] = [
  { value: "masturbation", label: "Masturbation" },
  { value: "pornography", label: "Pornography" },
  { value: "social_media", label: "Social Media" },
  { value: "gaming", label: "Gaming" },
  { value: "custom", label: "Custom Habit" },
];

export const GOAL_OPTIONS: { value: GoalType; label: string; description: string }[] = [
  { value: "quit_completely", label: "Quit completely", description: "Build a streak with zero exceptions." },
  { value: "reduce_frequency", label: "Reduce frequency", description: "Cut back gradually at your own pace." },
  { value: "improve_self_control", label: "Improve self-control", description: "Focus on awareness and response, not perfection." },
];

export const TARGET_DAY_OPTIONS = [7, 14, 21, 30, 60, 90];

export const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "great", label: "Great", emoji: "😄" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "stressed", label: "Stressed", emoji: "😣" },
  { value: "anxious", label: "Anxious", emoji: "😟" },
  { value: "low", label: "Low", emoji: "😔" },
];

export const TRIGGER_OPTIONS: { value: TriggerOption; label: string }[] = [
  { value: "boredom", label: "Boredom" },
  { value: "stress", label: "Stress" },
  { value: "loneliness", label: "Loneliness" },
  { value: "social_media", label: "Social Media" },
  { value: "fatigue", label: "Fatigue" },
  { value: "anxiety", label: "Anxiety" },
  { value: "sexual_content", label: "Sexual Content" },
  { value: "relationship_issues", label: "Relationship Issues" },
  { value: "other", label: "Other" },
];

export const MOOD_SCORE: Record<Mood, number> = {
  great: 5,
  good: 4,
  neutral: 3,
  stressed: 2,
  anxious: 2,
  low: 1,
};

// Multi-workflow support: the name of the cookie that remembers which
// workflow (habit) the user last selected, and a soft cap on how many
// live workflows a user can run at once so the app doesn't start feeling
// like a chore list.
export const CURRENT_HABIT_COOKIE = "discipline_current_habit";
export const MAX_ACTIVE_WORKFLOWS = 5;
