"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { StreakMode } from "@/types/database";

export function StreakModeToggle({ habitId, currentMode }: { habitId: string; currentMode: StreakMode }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState(currentMode);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: StreakMode) {
    if (next === mode) return;
    setSaving(true);
    setMode(next);
    await supabase.from("habits").update({ streak_mode: next }).eq("id", habitId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      {(["strict", "recovery"] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={saving}
          onClick={() => handleChange(m)}
          className={cn(
            "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium capitalize transition-colors",
            mode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
