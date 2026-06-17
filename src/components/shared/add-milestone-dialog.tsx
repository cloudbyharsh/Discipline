"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { milestoneSchema, type MilestoneInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddMilestoneDialog({ habitId }: { habitId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MilestoneInput>({ resolver: zodResolver(milestoneSchema) });

  async function onSubmit(values: MilestoneInput) {
    setSubmitting(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Not signed in.");
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("milestones").insert({
      user_id: userRes.user.id,
      habit_id: habitId,
      name: values.name,
      day_target: values.day_target,
      reward_description: values.reward_description || null,
      estimated_cost: values.estimated_cost ?? null,
      reward_image_url: values.reward_image_url || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Add milestone
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>Set a day target and, if you'd like, a reward to look forward to.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Milestone name</Label>
            <Input id="name" placeholder="e.g. One month clean" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="day_target">Day target</Label>
            <Input id="day_target" type="number" min={1} {...register("day_target")} />
            {errors.day_target && <p className="text-xs text-destructive">{errors.day_target.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reward_description">Reward (optional)</Label>
            <Textarea id="reward_description" placeholder="e.g. New pair of shoes" rows={2} {...register("reward_description")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimated_cost">Estimated cost (optional)</Label>
            <Input id="estimated_cost" type="number" min={0} step="0.01" {...register("estimated_cost")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Create milestone"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
