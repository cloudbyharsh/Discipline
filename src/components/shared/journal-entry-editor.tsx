"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MOOD_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { JournalEntry } from "@/types/database";

export function JournalEntryEditor({ entry }: { entry: JournalEntry }) {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const moodOpt = MOOD_OPTIONS.find((m) => m.value === entry.mood);
  const dirty = notes !== entry.notes;

  async function handleSave() {
    setSaving(true);
    await supabase.from("journal_entries").update({ notes }).eq("id", entry.id);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this journal entry? This can't be undone.")) return;
    setDeleting(true);
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    router.push("/journal");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{formatDate(entry.entry_date)}</h1>
          <div className="mt-1 flex items-center gap-2">
            {moodOpt && <Badge variant="outline">{moodOpt.emoji} {moodOpt.label}</Badge>}
            <Badge variant="secondary">Day {entry.streak_count}</Badge>
            {entry.urge_level != null && <Badge variant="outline">Urge {entry.urge_level}/10</Badge>}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting} aria-label="Delete entry">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {entry.triggers && entry.triggers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.triggers.map((t) => (
            <Badge key={t} variant="secondary">{t.replace(/_/g, " ")}</Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 pt-5">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={10} />
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
