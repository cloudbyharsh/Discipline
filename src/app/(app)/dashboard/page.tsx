import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserHabits, getCurrentHabit, getCheckIns, getMilestones, getJournalEntries } from "@/lib/data";
import { getCurrentHabitIdCookie } from "@/lib/current-habit";
import { getHabitDisplayName } from "@/lib/habit-display";
import { computeStreakStats, nextMilestoneDay } from "@/lib/streaks";
import { StreakStatCard } from "@/components/shared/streak-stat-card";
import { MoodTrendChart } from "@/components/shared/mood-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const habits = await getUserHabits(supabase, user.id);
  if (habits.length === 0) return null;

  const preferredId = await getCurrentHabitIdCookie();
  const habit = await getCurrentHabit(supabase, user.id, preferredId);
  if (!habit) return null;

  const [checkIns, milestones, journalEntries] = await Promise.all([
    getCheckIns(supabase, habit.id),
    getMilestones(supabase, habit.id),
    getJournalEntries(supabase, user.id, habit.id, 5),
  ]);

  const stats = computeStreakStats(checkIns, habit.streak_mode);
  const milestoneTargets = milestones.map((m) => m.day_target);
  const nextDay = nextMilestoneDay(stats.currentStreak, milestoneTargets.length ? milestoneTargets : [habit.first_target_days]);
  const nextMilestone = milestones.find((m) => m.day_target === nextDay);

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = checkIns.some((c) => c.check_in_date === today);

  // Compact at-a-glance cards for every live workflow, so users juggling
  // several goals can see all of them without leaving the dashboard.
  const otherHabits = habits.filter((h) => h.id !== habit.id);
  const overviewExtras = await Promise.all(
    otherHabits.map(async (h) => {
      const hCheckIns = await getCheckIns(supabase, h.id);
      const hStats = computeStreakStats(hCheckIns, h.streak_mode);
      const lastCheckIn = hCheckIns[hCheckIns.length - 1];
      return { habit: h, stats: hStats, lastCheckIn };
    })
  );
  const overview = [
    { habit, stats, lastCheckIn: checkIns[checkIns.length - 1] },
    ...overviewExtras,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Working on: {getHabitDisplayName(habit)}</p>
        </div>
        <Link href="/check-in" className={buttonVariants({ size: "lg" })}>
          {checkedInToday ? "Update today's check-in" : "Quick check-in"}
        </Link>
      </div>

      {habits.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">All workflows</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.map(({ habit: h, stats: s, lastCheckIn }) => (
              <Card key={h.id} className={cn(h.id === habit.id && "border-primary")}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{getHabitDisplayName(h)}</p>
                    {h.id === habit.id && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Current</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{s.currentStreak}</span>
                    <span className="text-xs text-muted-foreground">day streak</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((s.currentStreak / Math.max(1, h.first_target_days)) * 100))} />
                  <p className="text-xs text-muted-foreground">
                    {lastCheckIn ? `Last check-in: ${formatDate(lastCheckIn.check_in_date)}` : "No check-ins yet"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

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
