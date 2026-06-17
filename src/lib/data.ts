import type { SupabaseClient } from "@supabase/supabase-js";
import type { Habit, CheckIn, Milestone, JournalEntry, Settings } from "@/types/database";

export async function getActiveHabit(supabase: SupabaseClient, userId: string): Promise<Habit | null> {
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data as Habit | null;
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

export async function getJournalEntries(supabase: SupabaseClient, userId: string, limit = 20): Promise<JournalEntry[]> {
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as JournalEntry[];
}

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<Settings | null> {
  const { data } = await supabase.from("settings").select("*").eq("user_id", userId).maybeSingle();
  return data as Settings | null;
}
