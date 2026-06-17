import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: habit } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  redirect(habit ? "/dashboard" : "/onboarding");
}
