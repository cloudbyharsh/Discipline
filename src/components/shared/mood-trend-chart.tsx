"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MOOD_SCORE } from "@/lib/constants";
import type { CheckIn } from "@/types/database";
import { format, parseISO } from "date-fns";

export function MoodTrendChart({ checkIns }: { checkIns: CheckIn[] }) {
  const data = checkIns
    .slice(-30)
    .map((c) => ({
      date: format(parseISO(c.check_in_date), "MMM d"),
      mood: MOOD_SCORE[c.mood],
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Check in to start seeing your mood trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis domain={[1, 5]} hide />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          formatter={(v: number) => [v, "Mood score"]}
        />
        <Line type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
