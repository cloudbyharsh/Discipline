"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DangerZone() {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteData() {
    if (!confirm("Delete all check-ins, journal entries, and milestones? Your account stays active. This can't be undone.")) return;
    setBusy("data");
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;
    await Promise.all([
      supabase.from("check_ins").delete().eq("user_id", userId),
      supabase.from("journal_entries").delete().eq("user_id", userId),
      supabase.from("milestones").delete().eq("user_id", userId),
      supabase.from("rewards").delete().eq("user_id", userId),
      supabase.from("achievements").delete().eq("user_id", userId),
      supabase.from("notifications").delete().eq("user_id", userId),
    ]);
    setBusy(null);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (!confirm("Permanently delete your account and all data? This can't be undone.")) return;
    if (!confirm("Are you absolutely sure? This is your last chance to cancel.")) return;
    setBusy("account");
    setError(null);
    const res = await fetch("/api/delete-account", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Couldn't delete your account. Please try again.");
      setBusy(null);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>These actions are permanent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="outline" className="w-full" onClick={handleDeleteData} disabled={busy !== null}>
          {busy === "data" ? "Deleting…" : "Delete all data"}
        </Button>
        <Button variant="destructive" className="w-full" onClick={handleDeleteAccount} disabled={busy !== null}>
          {busy === "account" ? "Deleting…" : "Delete account"}
        </Button>
      </CardContent>
    </Card>
  );
}
