-- Discipline: multi-workflow support
-- Run this in the Supabase SQL editor after 0001_init.sql.
-- Adds a user-facing label and a soft-archive timestamp to habits so a single
-- user can run several independent workflows (e.g. "Quit X", "Daily reading",
-- "Meditation") side by side. `is_active` is kept for backwards compatibility
-- but is no longer the source of truth for "is this workflow live" -- that's
-- now archived_at is null. A workflow is "live" when archived_at is null,
-- and "archived" (soft-deleted, data kept) once archived_at is set.

alter table public.habits add column if not exists name text;
alter table public.habits add column if not exists archived_at timestamptz;

create index if not exists habits_user_archived_idx on public.habits(user_id, archived_at);

-- Backfill a sensible display name for any habit created before this migration.
update public.habits
set name = coalesce(
  nullif(custom_name, ''),
  case habit_type
    when 'masturbation' then 'Masturbation'
    when 'pornography' then 'Pornography'
    when 'social_media' then 'Social Media'
    when 'gaming' then 'Gaming'
    else 'Custom Habit'
  end
)
where name is null;
