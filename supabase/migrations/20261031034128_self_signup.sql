-- People add themselves (trip code → name, family, car, 4-digit PIN) instead of being pre-seeded.
-- The PIN lets someone log back in on a new phone / the APK without creating a duplicate.

delete from members; -- start clean: everyone re-joins via the link (also clears their locations)
drop function trip_roster(text);
drop function join_trip(text, uuid);

create extension if not exists pgcrypto with schema extensions;

create unique index members_trip_name on members (trip_id, lower(name));

-- Kept out of `members` so trip members can never read each other's PIN hashes:
-- RLS on with no policies = only the security definer functions below can touch it.
create table member_pins (
  member_id uuid primary key references members on delete cascade,
  pin_hash text not null,
  fails int not null default 0,
  locked_until timestamptz
);
alter table member_pins enable row level security;

-- Join screen: trip name, cars (with seat count) and who has joined. Null for a wrong code.
create function trip_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', t.name,
    'cars', (select coalesce(json_agg(json_build_object(
                'id', c.id, 'name', c.name, 'color', c.color,
                'count', (select count(*) from members m where m.car_id = c.id)) order by c.name), '[]')
             from cars c where c.trip_id = t.id),
    'members', (select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name, 'family', m.family) order by m.name), '[]')
                from members m where m.trip_id = t.id)
  )
  from trips t where t.code = p_code
$$;

create function register(p_code text, p_name text, p_family text, p_car uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_trip uuid;
  v_member uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_trip from trips where code = p_code;
  if v_trip is null then raise exception 'Wrong trip code'; end if;
  p_name := trim(p_name);
  p_family := trim(p_family);
  if length(p_name) not between 1 and 30 then raise exception 'Enter your name (up to 30 letters)'; end if;
  if length(p_family) not between 1 and 30 then raise exception 'Enter your family name (up to 30 letters)'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'PIN must be 4 digits'; end if;
  if not exists (select 1 from cars where id = p_car and trip_id = v_trip) then raise exception 'Pick a car'; end if;

  update members set user_id = null where user_id = auth.uid(); -- this phone was someone else before
  begin
    insert into members (trip_id, car_id, name, family, user_id)
    values (v_trip, p_car, p_name, p_family, auth.uid())
    returning id into v_member;
  exception when unique_violation then
    raise exception 'Someone already joined as "%". Add a surname or nickname.', p_name;
  end;
  insert into member_pins (member_id, pin_hash) values (v_member, crypt(p_pin, gen_salt('bf')));
end $$;

-- Returns 'ok' | 'wrong_pin' | 'locked' | 'not_found' instead of raising,
-- because raising would roll back the failed-attempt counter.
create function login(p_code text, p_member uuid, p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v member_pins%rowtype;
begin
  if auth.uid() is null then return 'not_found'; end if;
  select p.* into v
  from member_pins p join members m on m.id = p.member_id join trips t on t.id = m.trip_id
  where p.member_id = p_member and t.code = p_code;
  if not found then return 'not_found'; end if;
  if v.locked_until > now() then return 'locked'; end if;

  if v.pin_hash <> crypt(p_pin, v.pin_hash) then
    update member_pins set
      fails = case when fails + 1 >= 5 then 0 else fails + 1 end,
      locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' end
    where member_id = p_member;
    return 'wrong_pin';
  end if;

  update member_pins set fails = 0, locked_until = null where member_id = p_member;
  update members set user_id = null where user_id = auth.uid() and id <> p_member;
  update members set user_id = auth.uid() where id = p_member; -- the old phone is logged out
  return 'ok';
end $$;

revoke execute on function trip_info(text), register(text, text, text, uuid, text), login(text, uuid, text) from public;
grant execute on function trip_info(text) to anon, authenticated;
grant execute on function register(text, text, text, uuid, text), login(text, uuid, text) to authenticated;
