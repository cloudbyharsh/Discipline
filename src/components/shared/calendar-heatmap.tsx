"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckIn } from "@/types/database";

export function CalendarHeatmap({ checkIns }: { checkIns: CheckIn[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const byDate = useMemo(() => {
    const m = new Map<string, CheckIn>();
    for (const c of checkIns) m.set(c.check_in_date, c);
    return m;
  }, [checkIns]);

  const month = addMonths(new Date(), monthOffset);
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const leadingBlanks = getDay(start);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">{format(month, "MMMM yyyy")}</p>
        <Button variant="ghost" size="icon" onClick={() => setMonthOffset((m) => m + 1)} disabled={monthOffset >= 0} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const entry = byDate.get(key);
          return (
            <div
              key={key}
              title={`${format(day, "MMM d")}${entry ? (entry.was_successful ? " · on track" : " · slip") : ""}`}
              className={cn(
                "heatmap-cell flex items-center justify-center text-[10px] font-medium",
                !entry && "bg-secondary text-muted-foreground",
                entry?.was_successful && "bg-primary text-primary-foreground",
                entry && !entry.was_successful && "bg-destructive/20 text-destructive"
              )}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
