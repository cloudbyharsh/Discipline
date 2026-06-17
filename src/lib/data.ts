import type { SupabaseClient } from "@supabase/supabase-js";
import type { Habit, CheckIn, Milestone, JournalEntry, Settings } from "@/types/database";

/** All of a user's live (non-archived) workflows, oldest first. */
export async function getUserHabits(supabase: SupabaseClient, userId: string): Promise<Habit[]> {
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as Habit[];
}

/**
 * The workflow that should be active right now: the one matching
 * `preferredId` (typically read from a cookie) if it still exists and isn't
 * archived, otherwise the user's oldest live workflow, otherwise null.
 */
export async function getCurrentHabit(
  supabase: SupabaseClient,
  userId: string,
  preferredId?: string | null
): Promise<Habit | null> {
  const habits = await getUserHabits(supabase, userId);
  if (habits.length === 0) return null;
  if (preferredId) {
    const match = habits.find((h) => h.id === preferredId);
    if (match) return match;
  }
  return habits[0];
}

export async function getCheckIns(supabase: SupabaseClient, habitId: string): Promise<CheckIn[]> {
  const { data } = await supabase
    .from("check_ins")
    .select("*")
    .eq("habit_id", habitId)
    .order("check_in_date", { ascending: true });
  return (data ?? []) as CheckIn[];
}

export async function getMilestones(supabase: SupabaseClient, habitId: string): Promise<Milestone[]> {
  const { data } = await supabase
    .from("milestones")
    .select("*")
    .eq("habit_id", habitId)
    .order("day_target", { ascending: true });
  return (data ?? []) as Milestone[];
}

export async function getJournalEntries(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  limit = 20
): Promise<JournalEntry[]> {
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .order("entry_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as JournalEntry[];
}

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<Settings | null> {
  const { data } = await supabase.from("settings").select("*").eq("user_id", userId).maybeSingle();
  return data as Settings | null;
}
