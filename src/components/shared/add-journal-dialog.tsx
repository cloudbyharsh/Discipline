"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { journalEntrySchema, type JournalEntryInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
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

export function AddJournalDialog({ habitId }: { habitId: string | null }) {
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
  } = useForm<JournalEntryInput>({ resolver: zodResolver(journalEntrySchema), defaultValues: { triggers: [] } });

  async function onSubmit(values: JournalEntryInput) {
    setSubmitting(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setError("Not signed in.");
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("journal_entries").insert({
      user_id: userRes.user.id,
      habit_id: habitId,
      notes: values.notes,
      mood: values.mood || null,
      urge_level: values.urge_level ?? null,
      triggers: values.triggers ?? [],
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
          New entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New journal entry</DialogTitle>
          <DialogDescription>A free space to think things through — only you can see this.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes">What's on your mind?</Label>
            <Textarea id="notes" rows={6} {...register("notes")} />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
