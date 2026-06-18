"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_HABIT_COOKIE, GOAL_OPTIONS } from "@/lib/constants";
import { getHabitDisplayName } from "@/lib/habit-display";
import { writeClientCookie, readClientCookie } from "@/lib/utils";
import type { Habit } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkflowDialog } from "@/components/shared/create-workflow-dialog";

interface WorkflowsManagerProps {
  habits: Habit[];
  checkInCounts: Record<string, number>;
}

export function WorkflowsManager({ habits, checkInCounts }: WorkflowsManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      <CreateWorkflowDialog habitsCount={habits.length} triggerLabel="New workflow" className="w-full" />
    </div>
  );
}
