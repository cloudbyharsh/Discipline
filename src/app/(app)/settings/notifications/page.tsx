import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { NotificationSettingsForm } from "@/components/shared/notification-settings-form";
import type { Settings } from "@/types/database";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  let settings = await getSettings(supabase, userRes.user.id);
  if (!settings) {
    const { data } = await supabase
      .from("settings")
      .insert({ user_id: userRes.user.id })
      .select()
      .single();
    settings = data as Settings;
  }

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <NotificationSettingsForm settings={settings} />
    </div>
  );
}
