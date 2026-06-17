"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckCircle2, BookOpen, Trophy, BarChart3, Sparkles, Settings, LogOut, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, writeClientCookie } from "@/lib/utils";
import { CURRENT_HABIT_COOKIE } from "@/lib/constants";
import { getHabitDisplayName } from "@/lib/habit-display";
import type { Habit } from "@/types/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/check-in", label: "Check-In", icon: CheckCircle2 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/milestones", label: "Milestones", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MANAGE_WORKFLOWS_VALUE = "__manage__";

interface NavProps {
  habits?: Habit[];
  currentHabitId?: string | null;
}

export function Nav({ habits = [], currentHabitId = null }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleSwitch(value: string) {
    if (value === MANAGE_WORKFLOWS_VALUE) {
      router.push("/workflows");
      return;
    }
    writeClientCookie(CURRENT_HABIT_COOKIE, value, 60 * 60 * 24 * 365);
    router.refresh();
  }

  const switcher = habits.length > 0 ? (
    <Select value={currentHabitId ?? habits[0]?.id} onValueChange={handleSwitch}>
      <SelectTrigger className="mb-4">
        <Layers className="mr-2 h-4 w-4 shrink-0 opacity-60" />
        <SelectValue placeholder="Choose a workflow" />
      </SelectTrigger>
      <SelectContent>
        {habits.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {getHabitDisplayName(h)}
          </SelectItem>
        ))}
        <SelectItem value={MANAGE_WORKFLOWS_VALUE}>+ Manage workflows</SelectItem>
      </SelectContent>
    </Select>
  ) : null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            D
          </div>
          <span className="text-base font-semibold">Discipline</span>
        </div>
        {switcher}
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith(href) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
              pathname.startsWith(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
