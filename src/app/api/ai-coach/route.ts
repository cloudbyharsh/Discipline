import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJournalEntries } from "@/lib/data";
import { buildCoachSummary, buildCoachPrompt } from "@/lib/ai-coach";
import { aiCoachResponseSchema, type AICoachResponse } from "@/lib/validations";
import type { CheckIn, Habit } from "@/types/database";

export const dynamic = "force-dynamic";

const CACHE_KEY = "ai_coach_insight";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // regenerate at most once a day automatically
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5"; // cheap/fast -- this is a once-a-day summary, not a chat
const LLM_TIMEOUT_MS = 20_000;

interface RequestBody {
  habitId?: string;
  force?: boolean;
}

export async function POST(req: Request) {
  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError || !userRes.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = userRes.user.id;

  let habitId = body.habitId;
  if (!habitId) {
    const { data: firstHabit } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    habitId = firstHabit?.id;
  }
  if (!habitId) {
    return NextResponse.json({ error: "No active workflow found." }, { status: 404 });
  }

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();
  if (habitError || !habit) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  const force = body.force === true;

  // Cache check -- skip the LLM call entirely unless forced or stale.
  const { data: cached } = await supabase
    .from("analytics_cache")
    .select("payload, computed_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("cache_key", CACHE_KEY)
    .maybeSingle();

  if (!force && cached?.payload && cached.computed_at) {
    const age = Date.now() - new Date(cached.computed_at).getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({ ...(cached.payload as AICoachResponse), cached: true, computed_at: cached.computed_at });
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    // No key configured -- fail soft. If we have any prior cached insight
    // (even stale), serve that instead of breaking the page.
    if (cached?.payload) {
      return NextResponse.json({ ...(cached.payload as AICoachResponse), cached: true, computed_at: cached.computed_at, stale: true });
    }
    return NextResponse.json({ error: "AI Coach isn't configured yet." }, { status: 503 });
  }

  // Pull only the last ~30 check-ins (DB-side limit, not a full history dump)
  // plus a handful of recent journal entries, and aggregate before this ever
  // reaches a prompt.
  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select("*")
    .eq("habit_id", habitId)
    .order("check_in_date", { ascending: false })
    .limit(30);
  const checkIns = ((recentCheckIns ?? []) as CheckIn[]).reverse();
  const journalEntries = await getJournalEntries(supabase, userId, habitId, 10);

  const summary = buildCoachSummary(habit as Habit, checkIns, journalEntries);

  if (summary.daysTracked < 3) {
    return NextResponse.json(
      { error: "Log a few more check-ins before the coach has enough to go on." },
      { status: 422 }
    );
  }

  const { system, user } = buildCoachPrompt(summary);

  let parsed: AICoachResponse;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: 500,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`OpenRouter API responded with ${res.status}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    // Models occasionally wrap JSON in markdown fences despite instructions;
    // strip those defensively before parsing.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const json = JSON.parse(cleaned);
    const validated = aiCoachResponseSchema.safeParse(json);
    if (!validated.success) {
      throw new Error("Model output failed schema validation.");
    }
    parsed = validated.data;
  } catch (err) {
    // Defense in depth: never let an LLM/network failure break the page.
    // Serve the last good cached insight if we have one.
    if (cached?.payload) {
      return NextResponse.json({
        ...(cached.payload as AICoachResponse),
        cached: true,
        computed_at: cached.computed_at,
        stale: true,
      });
    }
    console.error("AI Coach generation failed:", err);
    return NextResponse.json(
      { error: "The coach couldn't generate an insight right now. Try again in a bit." },
      { status: 502 }
    );
  }

  const computedAt = new Date().toISOString();
  await supabase.from("analytics_cache").upsert(
    {
      user_id: userId,
      habit_id: habitId,
      cache_key: CACHE_KEY,
      payload: parsed,
      computed_at: computedAt,
    },
    { onConflict: "user_id,habit_id,cache_key" }
  );

  return NextResponse.json({ ...parsed, cached: false, computed_at: computedAt });
}
