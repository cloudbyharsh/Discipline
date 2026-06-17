"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Settings } from "@/types/database";

export function NotificationSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const supabase = createClient();
  const [enabled, setEnabled] = useState(settings.notifications_enabled);
  const [time, setTime] = useState(settings.daily_reminder_time ?? "20:00");
  const [saving, setSaving] = useState(false);

  async function persist(next: Partial<Pick<Settings, "notifications_enabled" | "daily_reminder_time">>) {
    setSaving(true);
    await supabase.from("settings").update(next).eq("user_id", settings.user_id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Daily reminder</CardTitle>
          <CardDescription>
            Notifications are always discreet — they'll never name your habit, just a gentle nudge to check in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-enabled">Enable daily reminder</Label>
            <Switch
              id="notif-enabled"
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                persist({ notifications_enabled: checked });
              }}
            />
          </div>
          {enabled && (
            <div className="space-y-1.5">
              <Label htmlFor="reminder-time">Reminder time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => persist({ daily_reminder_time: time })}
                className="w-40"
              />
            </div>
          )}
          {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
        </CardContent>
      </Card>
    </div>
  );
}
