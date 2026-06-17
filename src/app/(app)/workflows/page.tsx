import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserHabits, getCheckIns } from "@/lib/data";
import { WorkflowsManager } from "@/components/shared/workflows-manager";

export default async function WorkflowsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const habits = await getUserHabits(supabase, user.id);
  const counts = await Promise.all(
    habits.map(async (h) => ({ id: h.id, checkIns: (await getCheckIns(supabase, h.id)).length }))
  );
  const checkInCounts = Object.fromEntries(counts.map((c) => [c.id, c.checkIns]));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Manage workflows</h1>
        <p className="text-sm text-muted-foreground">
          Run multiple goals side by side. Each workflow keeps its own streak, check-ins, journal, and coaching context.
        </p>
      </div>
      <WorkflowsManager habits={habits} checkInCounts={checkInCounts} />
    </div>
  );
}
