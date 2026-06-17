// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you change the schema, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type HabitType = "masturbation" | "pornography" | "social_media" | "gaming" | "custom";
export type GoalType = "quit_completely" | "reduce_frequency" | "improve_self_control";
export type StreakMode = "strict" | "recovery";
export type Mood = "great" | "good" | "neutral" | "stressed" | "anxious" | "low";
export type TriggerOption =
  | "boredom"
  | "stress"
  | "loneliness"
  | "social_media"
  | "fatigue"
  | "anxiety"
  | "sexual_content"
  | "relationship_issues"
  | "other";

export interface Habit {
  id: string;
  user_id: string;
  name: string | null;
  habit_type: HabitType;
  custom_name: string | null;
  goal_type: GoalType;
  first_target_days: number;
  motivation_text: string | null;
  streak_mode: StreakMode;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  habit_id: string;
  check_in_date: string;
  was_successful: boolean;
  urge_level: number;
  mood: Mood;
  triggers: TriggerOption[];
  journal_text: string | null;
  streak_value_at_checkin: number;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  habit_id: string | null;
  check_in_id: string | null;
  entry_date: string;
  streak_count: number;
  mood: Mood | null;
  urge_level: number | null;
  triggers: TriggerOption[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  habit_id: string;
  name: string;
  day_target: number;
  reward_description: string | null;
  estimated_cost: number | null;
  reward_image_url: string | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  user_id: string;
  milestone_id: string | null;
  description: string;
  estimated_cost: number | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  habit_id: string | null;
  milestone_id: string | null;
  achievement_type: "milestone" | "best_streak" | "consistency" | "custom";
  title: string;
  description: string | null;
  earned_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  notification_type: "daily_checkin" | "streak_reminder" | "reflection" | "milestone_approaching";
  title: string;
  body: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Settings {
  user_id: string;
  pin_lock_enabled: boolean;
  pin_code_hash: string | null;
  biometric_enabled: boolean;
  notifications_enabled: boolean;
  daily_reminder_time: string | null;
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}
