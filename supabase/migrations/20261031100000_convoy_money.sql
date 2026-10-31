-- Prototype v2 → app: car shape for the illustration, shared headcount, expenses.

alter table cars add column kind text not null default 'hatch' check (kind in ('mpv', 'hatch'));
update cars set kind = 'mpv' where name = 'Triber';

-- Who is in the car right now. No row = in the car (everyone starts aboard).
create table car_headcount (
  member_id uuid primary key references members on delete cascade,
  trip_id uuid not null references trips on delete cascade,
  in_car boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table car_headcount enable row level security;
-- Anyone in the trip can tick anyone in or out (that's the point of a headcount).
create policy "own trip" on car_headcount for select using (trip_id = my_trip_id());
create policy "insert trip" on car_headcount for insert
  with check (trip_id = my_trip_id() and exists (select 1 from members m where m.id = member_id and m.trip_id = my_trip_id()));
create policy "update trip" on car_headcount for update using (trip_id = my_trip_id()) with check (trip_id = my_trip_id());

-- Shared expenses, split between families (by head count or equally — chosen in the app).
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  what text not null check (length(trim(what)) between 1 and 60),
  category text not null check (category in ('fuel', 'toll', 'food', 'stay', 'darshan', 'other')),
  amount int not null check (amount between 1 and 500000), -- whole rupees
  paid_by text not null check (length(paid_by) between 1 and 30), -- family name, as in members.family
  split text[] not null check (cardinality(split) between 1 and 20),
  created_by uuid references members on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_trip on expenses (trip_id, created_at desc);
alter table expenses enable row level security;
create policy "own trip" on expenses for select using (trip_id = my_trip_id());
create policy "insert own" on expenses for insert with check (trip_id = my_trip_id() and created_by = my_member_id());
-- ponytail: any trip member can delete any expense (family trust); restrict to created_by if that bites
create policy "delete trip" on expenses for delete using (trip_id = my_trip_id());

alter publication supabase_realtime add table car_headcount, expenses;
