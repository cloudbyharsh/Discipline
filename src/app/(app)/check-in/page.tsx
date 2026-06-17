"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { checkInSchema, type CheckInInput } from "@/lib/validations";
import { MOOD_OPTIONS, TRIGGER_OPTIONS } from "@/lib/constants";
import { computeStreakStats } from "@/lib/streaks";
import { cn, readClientCookie } from "@/lib/utils";
import { CURRENT_HABIT_COOKIE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CelebrationModal } from "@/components/shared/celebration-modal";
import type { CheckIn, Habit, Milestone } from "@/types/database";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CheckInPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Milestone | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckInInput>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      was_successful: true,
      urge_level: 3,
      mood: "neutral",
      triggers: [],
      journal_text: "",
    },
  });

  const wasSuccessful = watch("was_successful");
  const mood = watch("mood");
  const triggers = watch("triggers");

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        router.replace("/login");
        return;
      }
      const { data: liveHabits } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userRes.user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      const habits = (liveHabits ?? []) as Habit[];
      if (habits.length === 0) {
        router.replace("/onboarding");
        return;
      }
      const preferredId = readClientCookie(CURRENT_HABIT_COOKIE);
      const h = habits.find((x) => x.id === preferredId) ?? habits[0];
      setHabit(h);

      const { data: existing } = await supabase
        .from("check_ins")
        .select("*")
        .eq("habit_id", h.id)
        .eq("check_in_date", todayISO())
        .maybeSingle();

      if (existing) {
        const e = existing as CheckIn;
        setExistingId(e.id);
        reset({
          was_successful: e.was_successful,
          urge_level: e.urge_level,
          mood: e.mood,
          triggers: e.triggers ?? [],
          journal_text: e.journal_text ?? "",
        });
      }
      setLoading(false);
    })();
  }, [reset, router, supabase]);

  function toggleTrigger(value: string, checked: boolean) {
    const current = triggers ?? [];
    setValue("triggers", checked ? [...current, value] : current.filter((t) => t !== value));
  }

  async function onSubmit(values: CheckInInput) {
    if (!habit) return;
    setSaving(true);
    setError(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in.");

      const { data: priorRows } = await supabase
        .from("check_ins")
        .select("*")
        .eq("habit_id", habit.id)
        .neq("check_in_date", todayISO())
        .order("check_in_date", { ascending: true });

      const prior = (priorRows ?? []) as CheckIn[];
      const simulated: CheckIn[] = [
        ...prior,
        {
          id: "pending",
          user_id: userId,
          habit_id: habit.id,
          check_in_date: todayISO(),
          was_successful: values.was_successful,
          urge_level: values.urge_level,
          mood: values.mood,
          triggers: values.triggers as CheckIn["triggers"],
          journal_text: values.journal_text ?? null,
          streak_value_at_checkin: 0,
          created_at: "",
          updated_at: "",
        },
      ];
      const stats = computeStreakStats(simulated, habit.streak_mode);

      const { data: savedCheckIn, error: upsertError } = await supabase
        .from("check_ins")
        .upsert(
          {
            id: existingId ?? undefined,
            user_id: userId,
            habit_id: habit.id,
            check_in_date: todayISO(),
            was_successful: values.was_successful,
            urge_level: values.urge_level,
            mood: values.mood,
            triggers: values.triggers,
            journal_text: values.journal_text || null,
            streak_value_at_checkin: stats.currentStreak,
          },
          { onConflict: "habit_id,check_in_date" }
        )
        .select()
        .single();
      if (upsertError) throw upsertError;

      // Mirror into journal entries when there's text, so the journal module sees it.
      await supabase.from("journal_entries").delete().eq("check_in_id", savedCheckIn.id);
      if (values.journal_text && values.journal_text.trim().length > 0) {
        await supabase.from("journal_entries").insert({
          user_id: userId,
          habit_id: habit.id,
          check_in_id: savedCheckIn.id,
          entry_date: todayISO(),
          streak_count: stats.currentStreak,
          mood: values.mood,
          urge_level: values.urge_level,
          triggers: values.triggers,
          notes: values.journal_text,
        });
      }

      // Check for newly-reached milestones.
      const { data: milestoneRows } = await supabase
        .from("milestones")
        .select("*")
        .eq("habit_id", habit.id)
        .is("achieved_at", null)
        .lte("day_target", stats.currentStreak)
        .order("day_target", { ascending: false });

      const newlyAchieved = (milestoneRows ?? []) as Milestone[];
      if (newlyAchieved.length > 0) {
        const now = new Date().toISOString();
        await supabase
          .from("milestones")
          .update({ achieved_at: now })
          .in("id", newlyAchieved.map((m) => m.id));
        await supabase.from("achievements").insert(
          newlyAchieved.map((m) => ({
            user_id: userId,
            habit_id: habit.id,
            milestone_id: m.id,
            achievement_type: "milestone" as const,
            title: `${m.day_target}-day milestone: ${m.name}`,
            description: m.reward_description,
          }))
        );
        setCelebration(newlyAchieved[0]);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily check-in</h1>
        <p className="text-sm text-muted-foreground">
          {existingId ? "You already checked in today — feel free to update it." : "Takes less than a minute. Be honest; there's no judgment here."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How did today go?</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <button
              type="button"
              onClick={() => setValue("was_successful", true)}
              className={cn(
                "flex-1 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors",
                wasSuccessful ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              )}
            >
              Stayed on track
            </button>
            <button
              type="button"
              onClick={() => setValue("was_successful", false)}
              className={cn(
                "flex-1 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors",
                !wasSuccessful ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              )}
            >
              Had a slip
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urge level</CardTitle>
            <CardDescription>How strong was the urge today, at its peak?</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="urge_level"
              render={({ field }) => (
                <div className="space-y-3">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[field.value]}
                    onValueChange={(v) => field.onChange(v[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Barely there</span>
                    <span className="font-medium text-foreground">{field.value} / 10</span>
                    <span>Overwhelming</span>
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mood</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("mood", opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-colors",
                  mood === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                )}
              >
                <span className="text-xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Triggers</CardTitle>
            <CardDescription>Optional — select anything that played a role today.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {TRIGGER_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(triggers ?? []).includes(opt.value)}
                  onCheckedChange={(checked) => toggleTrigger(opt.value, checked === true)}
                />
                {opt.label}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>Optional — write whatever's on your mind.</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="journal_text"
              render={({ field }) => (
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="What happened today? What helped, what didn't?"
                  rows={5}
                />
              )}
            />
            {errors.journal_text && <p className="mt-1 text-xs text-destructive">{errors.journal_text.message}</p>}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Saving…" : existingId ? "Update check-in" : "Save check-in"}
        </Button>
      </form>

      <CelebrationModal
        open={!!celebration}
        dayTarget={celebration?.day_target ?? 0}
        rewardDescription={celebration?.reward_description}
        onClose={() => {
          setCelebration(null);
          router.push("/dashboard");
          router.refresh();
        }}
      />
    </div>
  );
}
