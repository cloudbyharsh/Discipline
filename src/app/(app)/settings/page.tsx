import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHabit } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StreakModeToggle } from "@/components/shared/streak-mode-toggle";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const habit = await getActiveHabit(supabase, userRes.user.id);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
      </div>

      {habit && (
        <Card>
          <CardHeader>
            <CardTitle>Streak mode</CardTitle>
            <CardDescription>
              Strict resets your streak on a slip. Recovery logs the slip but only takes a few days off your streak —
              built for people who'd rather keep going than start over.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StreakModeToggle habitId={habit.id} currentMode={habit.streak_mode} />
          </CardContent>
        </Card>
      )}

      <Card>
        <Link href="/settings/notifications" className="flex items-center justify-between p-5 hover:bg-secondary/50">
          <span className="flex items-center gap-3 text-sm font-medium">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Card>

      <Card>
        <Link href="/settings/privacy" className="flex items-center justify-between p-5 hover:bg-secondary/50">
          <span className="flex items-center gap-3 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Privacy & data
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Card>

      <LogoutButton />
    </div>
  );
}
