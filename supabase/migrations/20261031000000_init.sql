-- Tables for the trip app. New changes go in a NEW migration: npm run db:new <name>

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,          -- the 4-digit code shared on WhatsApp
  starts_at timestamptz not null
);

create table cars (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  color text not null
);

create table members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  car_id uuid references cars,
  name text not null,
  family text not null,               -- expenses split by family
  user_id uuid unique references auth.users  -- set when this person joins on their phone
);

-- Trip the current phone belongs to (security definer so policies don't recurse into members).
create function my_trip_id() returns uuid
language sql stable security definer set search_path = public as $$
  select trip_id from members where user_id = auth.uid()
$$;

alter table trips enable row level security;
alter table cars enable row level security;
alter table members enable row level security;

create policy "own trip" on trips for select using (id = my_trip_id());
create policy "own trip" on cars for select using (trip_id = my_trip_id());
create policy "own trip" on members for select using (trip_id = my_trip_id());

-- Join screen: code → list of names to pick from. Only works with the right code.
create function trip_roster(p_code text)
returns table (id uuid, name text, family text, taken boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.family, m.user_id is not null
  from members m join trips t on t.id = m.trip_id
  where t.code = p_code
  order by m.family, m.name
$$;

-- Claim a name. A phone can re-claim (reinstall) but can't steal someone else's name.
create function join_trip(p_code text, p_member uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set user_id = null where user_id = auth.uid();
  update members m set user_id = auth.uid()
  from trips t
  where m.id = p_member and t.id = m.trip_id and t.code = p_code and m.user_id is null;
  if not found then raise exception 'Wrong code or name already taken'; end if;
end $$;

grant execute on function trip_roster(text), join_trip(text, uuid) to anon, authenticated;
