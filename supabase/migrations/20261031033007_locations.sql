-- Live map: latest position per person (one row each, overwritten on every update).
-- ponytail: no history, add a locations_log table when trip stats (km driven) need it.

create function my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid()
$$;

create table locations (
  member_id uuid primary key references members on delete cascade,
  trip_id uuid not null references trips on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy real,   -- metres
  speed real,      -- m/s
  heading real,
  updated_at timestamptz not null default now()
);

alter table locations enable row level security;
create policy "own trip" on locations for select using (trip_id = my_trip_id());
create policy "insert own" on locations for insert with check (member_id = my_member_id() and trip_id = my_trip_id());
create policy "update own" on locations for update using (member_id = my_member_id()) with check (trip_id = my_trip_id());

alter publication supabase_realtime add table locations;
