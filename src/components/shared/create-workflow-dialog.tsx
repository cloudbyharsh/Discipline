"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { workflowSchema, type WorkflowInput } from "@/lib/validations";
import { HABIT_OPTIONS, GOAL_OPTIONS, TARGET_DAY_OPTIONS, CURRENT_HABIT_COOKIE, MAX_ACTIVE_WORKFLOWS } from "@/lib/constants";
import { writeClientCookie } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateWorkflowDialogProps {
  /** How many active workflows the user already has, to enforce MAX_ACTIVE_WORKFLOWS. */
  habitsCount: number;
  triggerLabel?: string;
  showIcon?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/**
 * The "create a new workflow" button + form, shared between the dashboard
 * (so users can add another goal without leaving it) and the Manage
 * Workflows page in Settings.
 */
export function CreateWorkflowDialog({
  habitsCount,
  triggerLabel = "New workflow",
  showIcon = true,
  variant = "default",
  size = "default",
  className,
}: CreateWorkflowDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = habitsCount >= MAX_ACTIVE_WORKFLOWS;

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
    setOpen(false);
    if (inserted) writeClientCookie(CURRENT_HABIT_COOKIE, inserted.id, 60 * 60 * 24 * 365);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={atCap} variant={variant} size={size} className={className}>
          {showIcon && <Plus className="mr-1.5 h-4 w-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workflow</DialogTitle>
          <DialogDescription>Track another goal independently, with its own streak and check-ins.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
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
          {habitsCount >= MAX_ACTIVE_WORKFLOWS - 1 && (
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
  );
}
