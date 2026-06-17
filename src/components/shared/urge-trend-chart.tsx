"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import type { CheckIn } from "@/types/database";

export function UrgeTrendChart({ checkIns }: { checkIns: CheckIn[] }) {
  const data = checkIns.map((c) => ({
    date: format(parseISO(c.check_in_date), "MMM d"),
    urge: c.urge_level,
  }));

  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No history yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => [v, "Urge level"]} />
        <Line type="monotone" dataKey="urge" stroke="hsl(var(--warning, 38 92% 50%))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
