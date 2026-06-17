import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveHabit, getCheckIns, getMilestones } from "@/lib/data";
import { computeStreakStats } from "@/lib/streaks";
import { AddMilestoneDialog } from "@/components/shared/add-milestone-dialog";
import { MilestoneCard } from "@/components/shared/milestone-card";
import type { Reward } from "@/types/database";

export default async function MilestonesPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const habit = await getActiveHabit(supabase, userRes.user.id);
  if (!habit) redirect("/onboarding");

  const [checkIns, milestones] = await Promise.all([getCheckIns(supabase, habit.id), getMilestones(supabase, habit.id)]);
  const stats = computeStreakStats(checkIns, habit.streak_mode);

  const { data: rewardRows } = await supabase.from("rewards").select("*").eq("user_id", userRes.user.id);
  const rewards = (rewardRows ?? []) as Reward[];
  const rewardByMilestone = new Map(rewards.filter((r) => r.milestone_id).map((r) => [r.milestone_id as string, r]));

  const achieved = milestones.filter((m) => m.achieved_at);
  const upcoming = milestones.filter((m) => !m.achieved_at);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Milestones</h1>
          <p className="text-sm text-muted-foreground">Set targets, earn rewards, build momentum.</p>
        </div>
        <AddMilestoneDialog habitId={habit.id} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming milestones yet — add one to give yourself something to aim for.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MilestoneCard key={m.id} milestone={m} currentStreak={stats.currentStreak} reward={rewardByMilestone.get(m.id) ?? null} />
            ))}
          </div>
        )}
      </section>

      {achieved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Achieved</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {achieved.map((m) => (
              <MilestoneCard key={m.id} milestone={m} currentStreak={stats.currentStreak} reward={rewardByMilestone.get(m.id) ?? null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
