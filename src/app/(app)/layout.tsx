import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { Nav } from "@/components/shared/nav";
import { PinGate } from "@/components/shared/pin-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: habit } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!habit) redirect("/onboarding");

  const settings = await getSettings(supabase, user.id);

  return (
    <PinGate settings={settings}>
      <div className="flex min-h-screen">
        <Nav />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </PinGate>
  );
}
