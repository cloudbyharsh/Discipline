"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUserHabits } from "@/lib/data";
import { readClientCookie, cn } from "@/lib/utils";
import { CURRENT_HABIT_COOKIE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Habit } from "@/types/database";
import type { AICoachResponse } from "@/lib/validations";

interface CoachState extends AICoachResponse {
  cached?: boolean;
  stale?: boolean;
  computed_at?: string;
}

const RISK_STYLES: Record<AICoachResponse["risk_level"], string> = {
  low: "bg-success/10 text-success",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-destructive/10 text-destructive",
};

// Minimum gap between manual refreshes, purely to stop accidental
// double-clicks from burning API calls -- the server-side 24h cache is the
// real cost control.
const REFRESH_COOLDOWN_MS = 60_000;

export default function AICoachPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [coach, setCoach] = useState<CoachState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshClick, setLastRefreshClick] = useState(0);

  const fetchInsight = useCallback(
    async (habitId: string, force: boolean) => {
      setError(null);
      try {
        const res = await fetch("/api/ai-coach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ habitId, force }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "Couldn't load your coaching insight.");
          setCoach(null);
          return;
        }
        setCoach(json as CoachState);
      } catch {
        setError("Couldn't reach the coach right now. Check your connection and try again.");
        setCoach(null);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        router.replace("/login");
        return;
      }
      let habits: Habit[];
      try {
        habits = await getUserHabits(supabase, userRes.user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your workflows.");
        setLoading(false);
        return;
      }
      if (habits.length === 0) {
        router.replace("/onboarding");
        return;
      }
      const preferredId = readClientCookie(CURRENT_HABIT_COOKIE);
      const h = habits.find((x) => x.id === preferredId) ?? habits[0];
      setHabit(h);
      await fetchInsight(h.id, false);
      setLoading(false);
    })();
  }, [fetchInsight, router, supabase]);

  async function handleRefresh() {
    if (!habit) return;
    const now = Date.now();
    if (now - lastRefreshClick < REFRESH_COOLDOWN_MS) return;
    setLastRefreshClick(now);
    setRefreshing(true);
    await fetchInsight(habit.id, true);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-secondary" />
        <div className="h-40 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Coach</h1>
          <p className="text-sm text-muted-foreground">
            A reflection on {habit?.name || "this workflow"}, generated from your check-ins.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || !habit}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && !coach && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {coach && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-foreground">{coach.headline}</CardTitle>
            <Badge className={RISK_STYLES[coach.risk_level]}>{coach.risk_level} risk</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground">{coach.insight}</p>
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Try this next</p>
              <p className="mt-1 text-sm text-foreground">{coach.suggested_action}</p>
            </div>
            {coach.risk_level === "high" && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This pattern looks tough to carry alone. Consider talking to a therapist or counselor who can give
                  you real support — this app can&apos;t.
                </span>
              </div>
            )}
            {coach.stale && (
              <p className="text-xs text-muted-foreground">
                Couldn&apos;t refresh just now — showing your last saved insight.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        AI-generated from your own logs. Not a substitute for professional support, and not built to handle a
        crisis — if you&apos;re in immediate danger, contact local emergency services or a crisis line.
      </p>
    </div>
  );
}
