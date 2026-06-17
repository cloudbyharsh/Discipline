"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Milestone, Reward } from "@/types/database";

export function MilestoneCard({
  milestone,
  currentStreak,
  reward,
}: {
  milestone: Milestone;
  currentStreak: number;
  reward: Reward | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [redeeming, setRedeeming] = useState(false);

  const achieved = !!milestone.achieved_at;
  const progressPct = Math.min(100, Math.round((currentStreak / milestone.day_target) * 100));

  async function handleRedeem() {
    setRedeeming(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;

    if (reward) {
      await supabase.from("rewards").update({ redeemed_at: new Date().toISOString() }).eq("id", reward.id);
    } else {
      await supabase.from("rewards").insert({
        user_id: userRes.user.id,
        milestone_id: milestone.id,
        description: milestone.reward_description ?? milestone.name,
        estimated_cost: milestone.estimated_cost,
        redeemed_at: new Date().toISOString(),
      });
    }
    setRedeeming(false);
    router.refresh();
  }

  return (
    <Card className={achieved ? "border-primary/40" : undefined}>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{milestone.name}</p>
            <p className="text-xs text-muted-foreground">{milestone.day_target} days</p>
          </div>
          {achieved && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Achieved {milestone.achieved_at ? formatDate(milestone.achieved_at) : ""}
            </span>
          )}
        </div>

        {!achieved && (
          <div className="space-y-1.5">
            <Progress value={progressPct} />
            <p className="text-xs text-muted-foreground">
              {currentStreak} / {milestone.day_target} days ({progressPct}%)
            </p>
          </div>
        )}

        {milestone.reward_description && (
          <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
            <span className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              {milestone.reward_description}
            </span>
            {achieved && (
              <Button size="sm" variant={reward?.redeemed_at ? "secondary" : "outline"} disabled={!!reward?.redeemed_at || redeeming} onClick={handleRedeem}>
                {reward?.redeemed_at ? "Redeemed" : redeeming ? "…" : "Mark redeemed"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
