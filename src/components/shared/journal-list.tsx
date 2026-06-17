"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MOOD_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { JournalEntry, Mood } from "@/types/database";

type SortKey = "date_desc" | "date_asc" | "streak_desc";

export function JournalList({ entries }: { entries: JournalEntry[] }) {
  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<Mood | "all">("all");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const filtered = useMemo(() => {
    let rows = entries;
    if (moodFilter !== "all") rows = rows.filter((e) => e.mood === moodFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((e) => e.notes.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      if (sort === "date_asc") return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      if (sort === "streak_desc") return b.streak_count - a.streak_count;
      return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    });
    return rows;
  }, [entries, query, moodFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search entries…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={moodFilter} onValueChange={(v) => setMoodFilter(v as Mood | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {MOOD_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.emoji} {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest first</SelectItem>
            <SelectItem value="date_asc">Oldest first</SelectItem>
            <SelectItem value="streak_desc">Highest streak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No entries match yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const moodOpt = MOOD_OPTIONS.find((m) => m.value === entry.mood);
            return (
              <Link key={entry.id} href={`/journal/${entry.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="space-y-2 pt-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(entry.entry_date)}</span>
                      <div className="flex items-center gap-2">
                        {moodOpt && <Badge variant="outline">{moodOpt.emoji} {moodOpt.label}</Badge>}
                        <Badge variant="secondary">Day {entry.streak_count}</Badge>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm">{entry.notes}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
