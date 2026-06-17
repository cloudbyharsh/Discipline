-- Discipline: initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ============================================================================
-- habits: the behavior the user is working on, plus their goal configuration
-- ============================================================================
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_type text not null check (habit_type in ('masturbation','pornography','social_media','gaming','custom')),
  custom_name text,
  goal_type text not null check (goal_type in ('quit_completely','reduce_frequency','improve_self_control')),
  first_target_days integer not null default 30,
  motivation_text text,
  streak_mode text not null default 'strict' check (streak_mode in ('strict','recovery')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_id_idx on public.habits(user_id);

-- ============================================================================
-- check_ins: one record per day per habit. This is the core AI-training table.
-- ============================================================================
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  check_in_date date not null default current_date,
  was_successful boolean not null,
  urge_level integer not null check (urge_level between 1 and 10),
  mood text not null check (mood in ('great','good','neutral','stressed','anxious','low')),
  triggers text[] not null default '{}',
  journal_text text,
  streak_value_at_checkin integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, check_in_date)
);
create index if not exists check_ins_user_id_idx on public.check_ins(user_id);
create index if not exists check_ins_habit_id_idx on public.check_ins(habit_id);
create index if not exists check_ins_date_idx on public.check_ins(check_in_date);

-- ============================================================================
-- journal_entries: free-form reflection, optionally linked to a check-in
-- ============================================================================
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  check_in_id uuid references public.check_ins(id) on delete set null,
  entry_date date not null default current_date,
  streak_count integer not null default 0,
  mood text check (mood in ('great','good','neutral','stressed','anxious','low')),
  urge_level integer check (urge_level between 1 and 10),
  triggers text[] not null default '{}',
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_user_id_idx on public.journal_entries(user_id);
create index if not exists journal_entries_date_idx on public.journal_entries(entry_date);

-- ============================================================================
-- milestones: user-defined day targets + rewards
-- ============================================================================
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  name text not null,
  day_target integer not null,
  reward_description text,
  estimated_cost numeric(10,2),
  reward_image_url text,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists milestones_user_id_idx on public.milestones(user_id);
create index if not exists milestones_habit_id_idx on public.milestones(habit_id);

-- ============================================================================
-- rewards: claimed/redeemed history tied to milestones (lets a milestone be reused)
-- ============================================================================
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  description text not null,
  estimated_cost numeric(10,2),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists rewards_user_id_idx on public.rewards(user_id);

-- ============================================================================
-- achievements: badges/celebrations earned (milestone hits, streak bests, etc.)
-- ============================================================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  achievement_type text not null check (achievement_type in ('milestone','best_streak','consistency','custom')),
  title text not null,
  description text,
  earned_at timestamptz not null default now()
);
create index if not exists achievements_user_id_idx on public.achievements(user_id);

-- ============================================================================
-- notifications: scheduled reminder preferences + delivery log
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('daily_checkin','streak_reminder','reflection','milestone_approaching')),
  title text not null,
  body text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- ============================================================================
-- analytics_cache: precomputed aggregates for fast dashboard/analytics loads
-- and a staging area for future AI/ML feature extraction.
-- ============================================================================
create table if not exists public.analytics_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  cache_key text not null,
  payload jsonb not null default '{}',
  computed_at timestamptz not null default now(),
  unique (user_id, habit_id, cache_key)
);
create index if not exists analytics_cache_user_id_idx on public.analytics_cache(user_id);
create index if not exists analytics_cache_payload_idx on public.analytics_cache using gin (payload);

-- ============================================================================
-- settings: per-user app preferences (privacy, notifications, streak mode)
-- ============================================================================
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_lock_enabled boolean not null default false,
  pin_code_hash text,
  biometric_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  daily_reminder_time time default '20:00',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists check_ins_set_updated_at on public.check_ins;
create trigger check_ins_set_updated_at before update on public.check_ins
  for each row execute function public.set_updated_at();

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security: every table is private to its owning user.
-- ============================================================================
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.milestones enable row level security;
alter table public.rewards enable row level security;
alter table public.achievements enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_cache enable row level security;
alter table public.settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['habits','check_ins','journal_entries','milestones','rewards','achievements','notifications','analytics_cache']
  loop
    execute format('drop policy if exists "select_own_%I" on public.%I', t, t);
    execute format('create policy "select_own_%I" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "insert_own_%I" on public.%I', t, t);
    execute format('create policy "insert_own_%I" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "update_own_%I" on public.%I', t, t);
    execute format('create policy "update_own_%I" on public.%I for update using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "delete_own_%I" on public.%I', t, t);
    execute format('create policy "delete_own_%I" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

drop policy if exists "select_own_settings" on public.settings;
create policy "select_own_settings" on public.settings for select using (auth.uid() = user_id);
drop policy if exists "insert_own_settings" on public.settings;
create policy "insert_own_settings" on public.settings for insert with check (auth.uid() = user_id);
drop policy if exists "update_own_settings" on public.settings;
create policy "update_own_settings" on public.settings for update using (auth.uid() = user_id);
drop policy if exists "delete_own_settings" on public.settings;
create policy "delete_own_settings" on public.settings for delete using (auth.uid() = user_id);

-- ============================================================================
-- Auto-create a settings row whenever a new auth user signs up.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
