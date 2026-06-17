import { cookies } from "next/headers";
import { CURRENT_HABIT_COOKIE } from "@/lib/constants";

/** Server-only: reads which workflow the user last selected, from a cookie. */
export async function getCurrentHabitIdCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(CURRENT_HABIT_COOKIE)?.value ?? null;
}
