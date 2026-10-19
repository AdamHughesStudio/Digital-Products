-- FindFore: every golf club in the UK and Ireland, from OpenStreetMap.
--
-- The database fetches the data itself (pg_net) from QLever, a public OpenStreetMap query service
-- run by the University of Freiburg, which knows exactly which country each course sits in.
-- OpenStreetMap data is © OpenStreetMap contributors, under the Open Database Licence; the app
-- credits it wherever these club details are shown.
--
-- To refresh the clubs (a few times a year is plenty):
--   1. select * from osm_fetch();                      -- returns five request ids, one per country
--   2. wait a minute, then for each id and country:     select osm_stage(<id>, '<country>');
--   3. towns: fire the place query (see git history of this file, or osm_places), then osm_stage_places(<id>)
--   4. for each country, in separate calls:             select osm_build_clubs('<country>');
-- Countries: scotland, england, wales, northern-ireland, ireland.

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  town text,
  region text,
  country text check (country in ('scotland', 'england', 'wales', 'ireland')),
  lat double precision not null,
  lng double precision not null,
  website text,
  phone text,
  holes integer,
  courses text[],
  source text not null default 'osm',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists clubs_country_idx on public.clubs (country);
alter table public.clubs enable row level security;
create policy "anyone can see clubs" on public.clubs for select to anon, authenticated using (true);

-- raw features and places as fetched; only the database functions use these
create table if not exists public.osm_raw (
  osm text primary key, country text not null, feature text not null, name text,
  lat double precision, lng double precision, website text, phone text, holes text,
  city text, operator text, course_type text, area double precision
);
alter table public.osm_raw enable row level security;

create table if not exists public.osm_places (
  id text primary key, name text not null, kind text not null,
  lat double precision not null, lng double precision not null
);
create index if not exists osm_places_lat_lng_idx on public.osm_places (lat, lng);
alter table public.osm_places enable row level security;

-- ---------- fetching ----------

create or replace function public.osm_fetch() returns table(country text, request_id bigint)
language plpgsql security definer set search_path = public as $$
declare q text; r record;
begin
  for r in select * from (values ('scotland', '58446'), ('england', '58447'), ('wales', '58437'), ('northern-ireland', '156393'), ('ireland', '62273')) v(c, rel) loop
    q := 'PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX osmrel: <https://www.openstreetmap.org/relation/>
PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX osm2rdf: <https://osm2rdf.cs.uni-freiburg.de/rdf#>
SELECT ?c ?feature ?name ?cen ?web ?web2 ?phone ?phone2 ?holes ?city ?op ?ctype ?area WHERE {
  osmrel:' || r.rel || ' ogc:sfContains ?c .
  { ?c osmkey:leisure "golf_course" . BIND("course" AS ?feature) } UNION { ?c osmkey:club "golf" . BIND("club" AS ?feature) }
  ?c geo:hasGeometry/geo:asWKT ?wkt . BIND(geof:centroid(?wkt) AS ?cen)
  OPTIONAL { ?c osmkey:name ?name }
  OPTIONAL { ?c osmkey:website ?web }
  OPTIONAL { ?c <https://www.openstreetmap.org/wiki/Key:contact:website> ?web2 }
  OPTIONAL { ?c osmkey:phone ?phone }
  OPTIONAL { ?c <https://www.openstreetmap.org/wiki/Key:contact:phone> ?phone2 }
  OPTIONAL { ?c <https://www.openstreetmap.org/wiki/Key:golf:holes> ?holes }
  OPTIONAL { ?c <https://www.openstreetmap.org/wiki/Key:addr:city> ?city }
  OPTIONAL { ?c osmkey:operator ?op }
  OPTIONAL { ?c <https://www.openstreetmap.org/wiki/Key:golf:course> ?ctype }
  OPTIONAL { ?c osm2rdf:area ?area }
}';
    country := r.c;
    request_id := net.http_get(url := 'https://qlever.cs.uni-freiburg.de/api/osm-planet', params := jsonb_build_object('query', q),
      headers := '{"Accept":"application/sparql-results+json"}'::jsonb, timeout_milliseconds := 180000);
    return next;
  end loop;
end $$;
revoke execute on function public.osm_fetch() from anon, public, authenticated;

-- towns, cities, villages and suburbs, used to name each club's town. Same pattern as osm_fetch:
--   SELECT ?p ?name ?kind ?cen WHERE { osmrel:<country> ogc:sfContains ?p . ?p a osm:node ;
--     osmkey:place ?kind ; osmkey:name ?name . FILTER(?kind IN ("city","town","village","suburb"))
--     ?p geo:hasGeometry/geo:asWKT ?cen . }

create or replace function public.osm_stage(resp bigint, ctry text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into osm_raw (osm, country, feature, name, lat, lng, website, phone, holes, city, operator, course_type, area)
  select distinct on (x.osm) x.osm, x.country, x.feature, x.name, x.lat, x.lng, x.website, x.phone, x.holes, x.city, x.operator, x.course_type, x.area from (
    select
      regexp_replace(b->'c'->>'value', '^https://www.openstreetmap.org/(node|way|relation)/(\d+)$', '\1/\2') as osm,
      ctry as country,
      b->'feature'->>'value' as feature,
      nullif(trim(b->'name'->>'value'), '') as name,
      (regexp_match(b->'cen'->>'value', 'POINT\(([-\d.]+) ([-\d.]+)\)'))[2]::float8 as lat,
      (regexp_match(b->'cen'->>'value', 'POINT\(([-\d.]+) ([-\d.]+)\)'))[1]::float8 as lng,
      coalesce(b->'web'->>'value', b->'web2'->>'value') as website,
      coalesce(b->'phone'->>'value', b->'phone2'->>'value') as phone,
      b->'holes'->>'value' as holes,
      b->'city'->>'value' as city,
      b->'op'->>'value' as operator,
      b->'ctype'->>'value' as course_type,
      (b->'area'->>'value')::float8 as area
    from net._http_response r, jsonb_array_elements(r.content::jsonb->'results'->'bindings') b
    where r.id = resp and r.status_code = 200
  ) x
  where x.lat is not null
  order by x.osm
  on conflict (osm) do update set country = excluded.country, feature = excluded.feature, name = excluded.name, lat = excluded.lat, lng = excluded.lng,
    website = excluded.website, phone = excluded.phone, holes = excluded.holes, city = excluded.city, operator = excluded.operator,
    course_type = excluded.course_type, area = excluded.area;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.osm_stage(bigint, text) from anon, public, authenticated;

create or replace function public.osm_stage_places(resp bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into osm_places (id, name, kind, lat, lng)
  select distinct on (x.id) x.id, x.name, x.kind, x.lat, x.lng from (
    select regexp_replace(b->'p'->>'value', '^https://www.openstreetmap.org/node/(\d+)$', 'n\1') as id,
      b->'name'->>'value' as name, b->'kind'->>'value' as kind,
      (regexp_match(b->'cen'->>'value', 'POINT\(([-\d.]+) ([-\d.]+)\)'))[2]::float8 as lat,
      (regexp_match(b->'cen'->>'value', 'POINT\(([-\d.]+) ([-\d.]+)\)'))[1]::float8 as lng
    from net._http_response r, jsonb_array_elements(r.content::jsonb->'results'->'bindings') b
    where r.id = resp and r.status_code = 200
  ) x where x.lat is not null order by x.id
  on conflict (id) do update set name = excluded.name, kind = excluded.kind, lat = excluded.lat, lng = excluded.lng;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.osm_stage_places(bigint) from anon, public, authenticated;

-- ---------- building clubs ----------
-- Drops pitch and putt, mini golf, footgolf, driving ranges and anything too small to be a course.
-- A course with a generic name ("Old Course", "Ailsa") takes its club from its operator (St Andrews
-- Links Trust becomes St Andrews Links) or the nearest properly named golf club within about 1 km.
-- Features of the same club within about 10 km become one club, listing its named courses. The
-- town is the address tag, or the nearest town or village. Clubs not rebuilt are hidden (active).

create or replace function public.osm_build_clubs(ctry text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  create temp table f0 on commit drop as
  select r.*,
    name ~* '(golf|links|club|\mgc\M|g\.c\.)' as golfy,
    nullif(trim(regexp_replace(operator, '\s+(trust|limited|ltd\.?|plc|llp)\s*$', '', 'i')), '') as op,
    coalesce(substring(holes from '\d+')::int, substring(course_type from '^(\d+)_hole')::int) as hole_count
  from osm_raw r
  where r.country = ctry
    and name is not null
    and name !~* '(pitch|putt\M|\mput\M|putting|foot ?golf|football|crazy golf|mini ?golf|miniature|adventure golf|driving range|disc golf|frisbee|top ?golf|bigshots|golf range|practice|par[- ]?3)'
    and coalesce(course_type, '') not in ('pitch_and_putt', 'miniature', 'driving_range', 'mini')
    and (area is null or area >= 40000);

  create temp table f on commit drop as
  select f0.*,
    lower(regexp_replace(
      case
        when op is not null and op !~ '@' and op !~* '(council|borough|city of|county)' and not golfy then op
        when not golfy and near.name is not null then near.name
        else f0.name
      end, '[^a-zA-Z0-9]+', ' ', 'g')) as key,
    case
      when op is not null and op !~ '@' and op !~* '(council|borough|city of|county)' and not golfy then op
      when not golfy and near.name is not null then near.name
      else f0.name
    end as club
  from f0
  left join lateral (
    select g2.name from f0 g2
    where g2.golfy and g2.osm <> f0.osm
      and g2.lat between f0.lat - 0.011 and f0.lat + 0.011 and g2.lng between f0.lng - 0.018 and f0.lng + 0.018
    order by (g2.lat - f0.lat) ^ 2 + ((g2.lng - f0.lng) * 0.6) ^ 2
    limit 1
  ) near on true;

  create temp table fa on commit drop as
  select f.*, anchor.osm as anchor
  from f
  cross join lateral (
    select f2.osm from f f2
    where f2.key = f.key and f2.lat between f.lat - 0.09 and f.lat + 0.09 and f2.lng between f.lng - 0.15 and f.lng + 0.15
    order by (f2.feature = 'course') desc, f2.area desc nulls last, f2.osm
    limit 1
  ) anchor;

  create temp table g on commit drop as
  select anchor as osm,
    (array_agg(club order by area desc nulls last))[1] as name,
    sum(lat * coalesce(area, 1)) / sum(coalesce(area, 1)) as lat,
    sum(lng * coalesce(area, 1)) / sum(coalesce(area, 1)) as lng,
    (array_agg(website) filter (where website is not null))[1] as website,
    (array_agg(phone) filter (where phone is not null))[1] as phone,
    (array_agg(city) filter (where city is not null))[1] as city,
    case when count(*) filter (where feature = 'course') = 1 then max(hole_count) end as holes,
    array_remove(array_agg(distinct case when feature = 'course' and lower(name) <> lower(club) then name end), null) as courses
  from fa group by anchor;

  update clubs set active = false
  where source = 'osm' and region = case ctry when 'scotland' then 'Scotland' when 'england' then 'England' when 'wales' then 'Wales' when 'northern-ireland' then 'Northern Ireland' else 'Ireland' end;

  insert into clubs (id, name, town, region, country, lat, lng, website, phone, holes, courses, source, active, updated_at)
  select
    'osm-' || replace(replace(replace(g.osm, 'node/', 'n'), 'way/', 'w'), 'relation/', 'r'),
    g.name,
    coalesce(g.city, p.name),
    case ctry when 'scotland' then 'Scotland' when 'england' then 'England' when 'wales' then 'Wales' when 'northern-ireland' then 'Northern Ireland' else 'Ireland' end,
    case when ctry = 'northern-ireland' then 'ireland' else ctry end,
    g.lat, g.lng,
    case when g.website ~* '^https?://' then g.website when g.website is not null then 'https://' || g.website end,
    g.phone, g.holes, nullif(g.courses, '{}'), 'osm', true, now()
  from g
  left join lateral (
    select pl.name from osm_places pl
    where pl.lat between g.lat - 0.08 and g.lat + 0.08 and pl.lng between g.lng - 0.14 and g.lng + 0.14
    order by ((pl.lat - g.lat) ^ 2 + ((pl.lng - g.lng) * 0.6) ^ 2)
      * case pl.kind when 'city' then 0.25 when 'town' then 0.5 when 'suburb' then 1.5 else 1 end
    limit 1
  ) p on true
  on conflict (id) do update set name = excluded.name, town = excluded.town, region = excluded.region, country = excluded.country,
    lat = excluded.lat, lng = excluded.lng, website = excluded.website, phone = excluded.phone, holes = excluded.holes,
    courses = excluded.courses, active = true, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.osm_build_clubs(text) from anon, public, authenticated;
