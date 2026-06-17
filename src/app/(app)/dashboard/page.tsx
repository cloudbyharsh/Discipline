import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveHabit, getCheckIns, getMilestones, getJournalEntries } from "@/lib/data";
import { computeStreakStats, nextMilestoneDay } from "@/lib/streaks";
import { HABIT_OPTIONS } from "@/lib/constants";
import { StreakStatCard } from "@/components/shared/streak-stat-card";
import { MoodTrendChart } from "@/components/shared/mood-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const habit = await getActiveHabit(supabase, user.id);
  if (!habit) return null;

  const [checkIns, milestones, journalEntries] = await Promise.all([
    getCheckIns(supabase, habit.id),
    getMilestones(supabase, habit.id),
    getJournalEntries(supabase, user.id, 5),
  ]);

  const stats = computeStreakStats(checkIns, habit.streak_mode);
  const milestoneTargets = milestones.map((m) => m.day_target);
  const nextDay = nextMilestoneDay(stats.currentStreak, milestoneTargets.length ? milestoneTargets : [habit.first_target_days]);
  const nextMilestone = milestones.find((m) => m.day_target === nextDay);
  const habitLabel = habit.habit_type === "custom" ? habit.custom_name : HABIT_OPTIONS.find((h) => h.value === habit.habit_type)?.label;

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = checkIns.some((c) => c.check_in_date === today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Working on: {habitLabel}</p>
        </div>
        <Link href="/check-in" className={buttonVariants({ size: "lg" })}>
          {checkedInToday ? "Update today's check-in" : "Quick check-in"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StreakStatCard label="Current Streak" value={stats.currentStreak} suffix="days" highlight />
        <StreakStatCard label="Best Streak" value={stats.bestStreak} suffix="days" />
        <StreakStatCard label="Consistency Score" value={`${stats.consistencyScore}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next milestone</CardTitle>
        </CardHeader>
        <CardContent>
          {nextDay ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-medium">{nextDay} Days</span>
                {nextMilestone?.reward_description && (
                  <span className="text-sm text-muted-foreground">Reward: {nextMilestone.reward_description}</span>
                )}
              </div>
              <Progress value={Math.min(100, Math.round((stats.currentStreak / nextDay) * 100))} />
              <p className="text-xs text-muted-foreground">
                {Math.max(0, nextDay - stats.currentStreak)} days to go
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set a milestone to give yourself something to look forward to.{" "}
              <Link href="/milestones" className="text-primary hover:underline">
                Add one
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mood trend (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <MoodTrendChart checkIns={checkIns} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent journal entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {journalEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries yet. Your first check-in can include one.</p>
            ) : (
              journalEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.id}`}
                  className="block rounded-lg border border-border p-3 text-sm transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(entry.entry_date)}</span>
                    <span>Streak: {entry.streak_count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-foreground">{entry.notes}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
