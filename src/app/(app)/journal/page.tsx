import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveHabit } from "@/lib/data";
import { AddJournalDialog } from "@/components/shared/add-journal-dialog";
import { JournalList } from "@/components/shared/journal-list";
import type { JournalEntry } from "@/types/database";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const habit = await getActiveHabit(supabase, userRes.user.id);

  const { data: entryRows } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userRes.user.id)
    .order("entry_date", { ascending: false })
    .limit(500);
  const entries = (entryRows ?? []) as JournalEntry[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground">Private to you. Search, filter, and look back whenever you need to.</p>
        </div>
        <AddJournalDialog habitId={habit?.id ?? null} />
      </div>
      <JournalList entries={entries} />
    </div>
  );
}
