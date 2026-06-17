"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Archive, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { workflowSchema, type WorkflowInput } from "@/lib/validations";
import { HABIT_OPTIONS, GOAL_OPTIONS, TARGET_DAY_OPTIONS, CURRENT_HABIT_COOKIE, MAX_ACTIVE_WORKFLOWS } from "@/lib/constants";
import { getHabitDisplayName } from "@/lib/habit-display";
import { writeClientCookie, readClientCookie } from "@/lib/utils";
import type { Habit } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WorkflowsManagerProps {
  habits: Habit[];
  checkInCounts: Record<string, number>;
}

export function WorkflowsManager({ habits, checkInCounts }: WorkflowsManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atCap = habits.length >= MAX_ACTIVE_WORKFLOWS;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<WorkflowInput>({
    resolver: zodResolver(workflowSchema),
    defaultValues: { habit_type: "custom", goal_type: "quit_completely", first_target_days: 30 },
  });
  const habitType = watch("habit_type");

  async function onCreate(values: WorkflowInput) {
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Not signed in.");
      return;
    }
    const { data: inserted, error: insertError } = await supabase
      .from("habits")
      .insert({
        user_id: userRes.user.id,
        name: values.name || null,
        habit_type: values.habit_type,
        custom_name: values.custom_name || null,
        goal_type: values.goal_type,
        first_target_days: values.first_target_days,
        motivation_text: values.motivation_text,
        is_active: true,
      })
      .select("id")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    reset();
    setCreateOpen(false);
    if (inserted) writeClientCookie(CURRENT_HABIT_COOKIE, inserted.id, 60 * 60 * 24 * 365);
    router.refresh();
  }

  async function handleArchive(habit: Habit) {
    if (!confirm(`Archive "${getHabitDisplayName(habit)}"? You can't add new check-ins to it afterward, but its history stays intact.`)) return;
    setBusyId(habit.id);
    const { error: updateError } = await supabase
      .from("habits")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", habit.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const current = readClientCookie(CURRENT_HABIT_COOKIE);
    if (current === habit.id) {
      const fallback = habits.find((h) => h.id !== habit.id);
      if (fallback) writeClientCookie(CURRENT_HABIT_COOKIE, fallback.id, 60 * 60 * 24 * 365);
    }
    router.refresh();
  }

  function startRename(habit: Habit) {
    setRenamingId(habit.id);
    setRenameValue(getHabitDisplayName(habit));
  }

  async function saveRename(habitId: string) {
    setBusyId(habitId);
    const { error: updateError } = await supabase
      .from("habits")
      .update({ name: renameValue.trim() || null })
      .eq("id", habitId);
    setBusyId(null);
    setRenamingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {habits.map((habit) => (
          <Card key={habit.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                {renamingId === habit.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-8"
                    />
                    <button onClick={() => saveRename(habit.id)} className="text-primary" aria-label="Save name">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="text-muted-foreground" aria-label="Cancel rename">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{getHabitDisplayName(habit)}</p>
                    <button onClick={() => startRename(habit)} className="text-muted-foreground hover:text-foreground" aria-label="Rename">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {GOAL_OPTIONS.find((g) => g.value === habit.goal_type)?.label} · {checkInCounts[habit.id] ?? 0} check-ins
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === habit.id}
                onClick={() => handleArchive(habit)}
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </Button>
            </CardContent>
          </Card>
        ))}
        {habits.length === 0 && (
          <p className="text-sm text-muted-foreground">No active workflows yet.</p>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button disabled={atCap} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" />
            New workflow
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workflow</DialogTitle>
            <DialogDescription>Track another goal independently, with its own streak and check-ins.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Workflow name (optional)</Label>
              <Input id="name" placeholder="e.g. Reading streak" {...register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>What are you working on?</Label>
              <Controller
                control={control}
                name="habit_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {habitType === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="custom_name">Custom habit name</Label>
                <Input id="custom_name" placeholder="e.g. Late-night snacking" {...register("custom_name")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Controller
                control={control}
                name="goal_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>First target (days)</Label>
              <Controller
                control={control}
                name="first_target_days"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivation_text">Why does this matter to you?</Label>
              <Textarea id="motivation_text" rows={3} {...register("motivation_text")} />
              {errors.motivation_text && <p className="text-xs text-destructive">{errors.motivation_text.message}</p>}
            </div>
            {habits.length >= MAX_ACTIVE_WORKFLOWS - 1 && (
              <p className="text-xs text-muted-foreground">
                Up to {MAX_ACTIVE_WORKFLOWS} active workflows are supported at once — archive one to make room for more.
              </p>
            )}
            <Button type="submit" className="w-full">
              Create workflow
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
