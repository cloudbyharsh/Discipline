import type { CheckIn, StreakMode } from "@/types/database";

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalSuccessfulDays: number;
  totalSlipDays: number;
  consistencyScore: number; // 0-100
}

/**
 * Computes streak stats from a list of check-ins (any order).
 *
 * Strict mode: any unsuccessful day resets the current streak to 0.
 * Recovery mode: an unsuccessful day logs a "slip" and applies a one-day
 * penalty to the streak rather than zeroing it out, so a single setback
 * doesn't erase weeks of progress.
 */
export function computeStreakStats(checkIns: CheckIn[], mode: StreakMode): StreakStats {
  const sorted = [...checkIns].sort(
    (a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()
  );

  let current = 0;
  let best = 0;
  let totalSuccess = 0;
  let totalSlip = 0;

  for (const entry of sorted) {
    if (entry.was_successful) {
      current += 1;
      totalSuccess += 1;
    } else {
      totalSlip += 1;
      if (mode === "strict") {
        current = 0;
      } else {
        current = Math.max(0, current - 3);
      }
    }
    if (current > best) best = current;
  }

  const totalDays = sorted.length;
  const consistencyScore = totalDays === 0 ? 0 : Math.round((totalSuccess / totalDays) * 100);

  return {
    currentStreak: current,
    bestStreak: best,
    totalSuccessfulDays: totalSuccess,
    totalSlipDays: totalSlip,
    consistencyScore,
  };
}

export function nextMilestoneDay(currentStreak: number, targets: number[]): number | null {
  const upcoming = targets.filter((t) => t > currentStreak).sort((a, b) => a - b);
  return upcoming.length > 0 ? upcoming[0] : null;
}
