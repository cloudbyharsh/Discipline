import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserHabits } from "@/lib/data";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const habits = await getUserHabits(supabase, user.id);

  redirect(habits.length > 0 ? "/dashboard" : "/onboarding");
}
