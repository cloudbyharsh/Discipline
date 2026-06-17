"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TRIGGER_OPTIONS } from "@/lib/constants";
import type { CheckIn } from "@/types/database";

export function TriggerFrequencyChart({ checkIns }: { checkIns: CheckIn[] }) {
  const counts = new Map<string, number>();
  for (const c of checkIns) {
    for (const t of c.triggers ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const data = TRIGGER_OPTIONS.map((opt) => ({ label: opt.label, count: counts.get(opt.value) ?? 0 })).filter(
    (d) => d.count > 0
  );

  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No triggers logged yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
