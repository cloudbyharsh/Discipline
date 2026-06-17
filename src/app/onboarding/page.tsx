"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HABIT_OPTIONS, GOAL_OPTIONS, TARGET_DAY_OPTIONS } from "@/lib/constants";
import type { HabitType, GoalType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEPS = ["habit", "goal", "target", "why"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [habitType, setHabitType] = useState<HabitType | null>(null);
  const [customName, setCustomName] = useState("");
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [targetDays, setTargetDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  function canContinue() {
    if (step === "habit") return habitType !== null && (habitType !== "custom" || customName.trim().length > 0);
    if (step === "goal") return goalType !== null;
    if (step === "target") return targetDays !== null || Number(customDays) > 0;
    if (step === "why") return motivation.trim().length > 0;
    return false;
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    const finalTarget = targetDays ?? Number(customDays);
    const { error: insertError } = await supabase.from("habits").insert({
      user_id: user.id,
      habit_type: habitType,
      custom_name: habitType === "custom" ? customName.trim() : null,
      goal_type: goalType,
      first_target_days: finalTarget,
      motivation_text: motivation.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      handleFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <Card>
          <CardContent className="space-y-5 pt-6">
            {step === "habit" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">What are you working on?</h2>
                  <p className="text-sm text-muted-foreground">This stays completely private to you.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {HABIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setHabitType(opt.value)}
                      className={cn(
                        "rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                        habitType === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {habitType === "custom" && (
                  <Input
                    placeholder="Name your habit"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                )}
              </div>
            )}

            {step === "goal" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">What's your goal?</h2>
                  <p className="text-sm text-muted-foreground">There's no wrong answer here.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGoalType(opt.value)}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left transition-colors",
                        goalType === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      )}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "target" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Pick your first target</h2>
                  <p className="text-sm text-muted-foreground">You can always set a new one later.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setTargetDays(d);
                        setCustomDays("");
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        targetDays === d ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      )}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-days">Or choose a custom number of days</Label>
                  <Input
                    id="custom-days"
                    type="number"
                    min={1}
                    placeholder="e.g. 45"
                    value={customDays}
                    onChange={(e) => {
                      setCustomDays(e.target.value);
                      setTargetDays(null);
                    }}
                  />
                </div>
              </div>
            )}

            {step === "why" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Why does this matter to you?</h2>
                  <p className="text-sm text-muted-foreground">
                    We'll bring this back to you on hard days — it's the reason you started.
                  </p>
                </div>
                <Textarea
                  placeholder="I want this because…"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={5}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
              >
                Back
              </Button>
              <Button type="button" onClick={next} disabled={!canContinue() || submitting}>
                {stepIndex === STEPS.length - 1 ? (submitting ? "Setting up…" : "Start") : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
