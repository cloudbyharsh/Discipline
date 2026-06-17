import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JournalEntryEditor } from "@/components/shared/journal-entry-editor";
import type { JournalEntry } from "@/types/database";

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data } = await supabase.from("journal_entries").select("*").eq("id", id).eq("user_id", userRes.user.id).maybeSingle();
  if (!data) notFound();

  return <JournalEntryEditor entry={data as JournalEntry} />;
}
