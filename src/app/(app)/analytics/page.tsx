import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHabit, getCheckIns } from "@/lib/data";
import { getCurrentHabitIdCookie } from "@/lib/current-habit";
import { computeStreakStats } from "@/lib/streaks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StreakStatCard } from "@/components/shared/streak-stat-card";
import { StreakHistoryChart } from "@/components/shared/streak-history-chart";
import { MoodTrendChart } from "@/components/shared/mood-trend-chart";
import { UrgeTrendChart } from "@/components/shared/urge-trend-chart";
import { TriggerFrequencyChart } from "@/components/shared/trigger-frequency-chart";
import { CalendarHeatmap } from "@/components/shared/calendar-heatmap";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const preferredId = await getCurrentHabitIdCookie();
  const habit = await getCurrentHabit(supabase, userRes.user.id, preferredId);
  if (!habit) redirect("/onboarding");

  const checkIns = await getCheckIns(supabase, habit.id);
  const stats = computeStreakStats(checkIns, habit.streak_mode);
  const totalDays = checkIns.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Patterns over time — useful for spotting what's working.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StreakStatCard label="Current streak" value={stats.currentStreak} suffix="days" highlight />
        <StreakStatCard label="Best streak" value={stats.bestStreak} suffix="days" />
        <StreakStatCard label="Success rate" value={stats.consistencyScore} suffix="%" />
        <StreakStatCard label="Days tracked" value={totalDays} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Streak history</CardTitle>
          <CardDescription>Your streak value after every check-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <StreakHistoryChart checkIns={checkIns} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mood trend</CardTitle>
            <CardDescription>Last 30 check-ins.</CardDescription>
          </CardHeader>
          <CardContent>
            <MoodTrendChart checkIns={checkIns} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Urge trend</CardTitle>
            <CardDescription>Self-reported urge intensity, 1–10.</CardDescription>
          </CardHeader>
          <CardContent>
            <UrgeTrendChart checkIns={checkIns.slice(-30)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trigger frequency</CardTitle>
          <CardDescription>What tends to show up before a slip.</CardDescription>
        </CardHeader>
        <CardContent>
          <TriggerFrequencyChart checkIns={checkIns} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Green = on track, red = slip, grey = no check-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap checkIns={checkIns} />
        </CardContent>
      </Card>
    </div>
  );
}
