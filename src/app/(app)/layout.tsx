import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSettings, getUserHabits } from "@/lib/data";
import { CURRENT_HABIT_COOKIE } from "@/lib/constants";
import { Nav } from "@/components/shared/nav";
import { PinGate } from "@/components/shared/pin-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const habits = await getUserHabits(supabase, user.id);
  if (habits.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(CURRENT_HABIT_COOKIE)?.value ?? null;
  const currentHabitId = habits.find((h) => h.id === preferredId)?.id ?? habits[0].id;

  const settings = await getSettings(supabase, user.id);

  return (
    <PinGate settings={settings}>
      <div className="flex min-h-screen">
        <Nav habits={habits} currentHabitId={currentHabitId} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </PinGate>
  );
}
