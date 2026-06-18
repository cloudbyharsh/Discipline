import type { CheckIn, Habit, JournalEntry, TriggerOption } from "@/types/database";
import { computeStreakStats } from "@/lib/streaks";
import { MOOD_SCORE, HABIT_OPTIONS, GOAL_OPTIONS } from "@/lib/constants";

// How much raw text we're willing to send to a third-party LLM. This app
// handles compulsive-behavior recovery, including sexual content, so we
// deliberately keep snippets short and few rather than forwarding full
// journal history -- the model only needs enough to spot a pattern, not a
// verbatim transcript.
const MAX_SNIPPETS = 3;
const MAX_SNIPPET_CHARS = 220;
const MAX_CHECKINS_CONSIDERED = 30;

export interface TriggerFrequency {
  trigger: TriggerOption;
  count: number;
}

export interface CoachSummary {
  habitLabel: string;
  goalLabel: string;
  streakMode: string;
  motivationText: string | null;
  currentStreak: number;
  bestStreak: number;
  consistencyScore: number;
  daysTracked: number;
  slipsLast14Days: number;
  topTriggers: TriggerFrequency[];
  moodTrend: "improving" | "declining" | "stable" | "not_enough_data";
  recentSnippets: string[];
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function topTriggers(checkIns: CheckIn[], limit = 3): TriggerFrequency[] {
  const counts = new Map<string, number>();
  for (const c of checkIns) {
    for (const t of c.triggers ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([trigger, count]) => ({ trigger: trigger as TriggerOption, count }));
}

function moodTrend(sorted: CheckIn[]): CoachSummary["moodTrend"] {
  if (sorted.length < 6) return "not_enough_data";
  const recent = sorted.slice(-7);
  const prior = sorted.slice(-14, -7);
  if (prior.length === 0) return "not_enough_data";
  const avg = (arr: CheckIn[]) => arr.reduce((sum, c) => sum + MOOD_SCORE[c.mood], 0) / arr.length;
  const diff = avg(recent) - avg(prior);
  if (diff > 0.4) return "improving";
  if (diff < -0.4) return "declining";
  return "stable";
}

/**
 * Aggregates raw check-ins/journal rows into a compact, pre-computed summary
 * the LLM can reason over. Deliberately does NOT hand the model a wall of
 * raw rows -- streak math reuses computeStreakStats (same logic the
 * dashboard already trusts), and free-text is capped to a handful of short,
 * truncated snippets.
 */
export function buildCoachSummary(
  habit: Habit,
  allCheckIns: CheckIn[],
  journalEntries: JournalEntry[]
): CoachSummary {
  const sorted = [...allCheckIns]
    .sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
    .slice(-MAX_CHECKINS_CONSIDERED);

  const stats = computeStreakStats(sorted, habit.streak_mode);

  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const slipsLast14Days = sorted.filter(
    (c) => !c.was_successful && new Date(c.check_in_date).getTime() >= cutoff
  ).length;

  const habitLabel = habit.name || HABIT_OPTIONS.find((h) => h.value === habit.habit_type)?.label || "this habit";
  const goalLabel = GOAL_OPTIONS.find((g) => g.value === habit.goal_type)?.label ?? habit.goal_type;

  // Pull the most recent few free-text notes (check-in journal text first,
  // then standalone journal entries), newest first, trimmed and truncated.
  const checkInNotes = [...sorted]
    .reverse()
    .map((c) => c.journal_text)
    .filter((t): t is string => !!t && t.trim().length > 0);
  const standaloneNotes = journalEntries.map((j) => j.notes).filter((t) => t.trim().length > 0);
  const recentSnippets = [...checkInNotes, ...standaloneNotes]
    .slice(0, MAX_SNIPPETS)
    .map((t) => truncate(t, MAX_SNIPPET_CHARS));

  return {
    habitLabel,
    goalLabel,
    streakMode: habit.streak_mode,
    motivationText: habit.motivation_text ? truncate(habit.motivation_text, 300) : null,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    consistencyScore: stats.consistencyScore,
    daysTracked: sorted.length,
    slipsLast14Days,
    topTriggers: topTriggers(sorted),
    moodTrend: moodTrend(sorted),
    recentSnippets,
  };
}

const SYSTEM_PROMPT = `You are a supportive, non-judgmental recovery coach inside a habit-tracking app. Users are working on compulsive behaviors (pornography, masturbation, social media, gaming, or a custom habit) and have opted into AI-generated reflections on their own logged data.

Rules:
- Be warm, specific, and grounded in the data given. Never shame, lecture, or moralize.
- Never use clinical/diagnostic language or claim to provide therapy.
- You are not a crisis-response tool. If the data suggests serious distress, gently suggest professional support rather than trying to handle it yourself.
- Keep it concrete: reference the user's own streak, triggers, or mood trend rather than generic advice.
- Respond with ONLY a single JSON object, no markdown fences, no prose outside the JSON, matching exactly this shape:
{"headline": string (<=60 chars), "insight": string (2-4 sentences), "risk_level": "low" | "medium" | "high", "suggested_action": string (1-2 sentences, one concrete next step)}`;

export function buildCoachPrompt(summary: CoachSummary): { system: string; user: string } {
  const lines = [
    `Habit: ${summary.habitLabel}`,
    `Goal: ${summary.goalLabel}`,
    `Streak mode: ${summary.streakMode}`,
    `Current streak: ${summary.currentStreak} days (best: ${summary.bestStreak})`,
    `Consistency score (last ${summary.daysTracked} tracked days): ${summary.consistencyScore}%`,
    `Slips in last 14 days: ${summary.slipsLast14Days}`,
    `Mood trend: ${summary.moodTrend}`,
    `Top triggers: ${summary.topTriggers.length ? summary.topTriggers.map((t) => `${t.trigger} (${t.count}x)`).join(", ") : "none logged"}`,
  ];
  if (summary.motivationText) lines.push(`User's stated motivation: "${summary.motivationText}"`);
  if (summary.recentSnippets.length) {
    lines.push("Recent journal snippets (most recent first, truncated):");
    summary.recentSnippets.forEach((s, i) => lines.push(`  ${i + 1}. "${s}"`));
  }
  lines.push("", "Generate today's coaching reflection as the JSON object described in your instructions.");
  return { system: SYSTEM_PROMPT, user: lines.join("\n") };
}
