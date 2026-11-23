"""Check extracted opens and write the insert SQL.

    python3 -I build_opens_insert.py extract-*.json > insert.sql   (problems go to stderr)
"""
import datetime as dt
import hashlib
import json
import re
import sys

TODAY = dt.date.today()
FORMATS = {'stableford', 'stroke', 'scramble', 'greensomes', 'fourball', 'matchplay', 'foursomes', 'other'}
GENDERS = {'men', 'women', 'mixed'}
ENTRIES = {'individual', 'pairs', 'teams'}
BASES = {'per person', 'per pair', 'per team'}
STATUSES = {'open', 'closing', 'full', 'waiting_list', 'ballot', 'closed', 'not_open'}
BANNED = re.compile(r'golfempire', re.I)
DASH = re.compile('[–—]')

opens, problems, seen = [], [], set()
for path in sys.argv[1:]:
    for o in json.load(open(path)).get('opens', []):
        why = []
        try:
            start = dt.date.fromisoformat(o['starts_on'])
        except Exception:
            why.append('bad start date')
            start = None
        if start and start < TODAY:
            why.append('in the past')
        if start and start > TODAY + dt.timedelta(days=500):
            why.append('too far ahead')
        end = o.get('ends_on')
        if end:
            try:
                if dt.date.fromisoformat(end) < start:
                    why.append('ends before it starts')
            except Exception:
                why.append('bad end date')
        if not o.get('title'):
            why.append('no title')
        for k, allowed in (('format', FORMATS), ('entry', ENTRIES), ('fee_basis', BASES), ('entry_status', STATUSES)):
            if o.get(k) is not None and o[k] not in allowed:
                if k == 'fee_basis' and o[k] == 'per player':
                    o[k] = 'per person'
                else:
                    why.append(f'{k}={o[k]}')
        if o.get('gender') not in GENDERS:
            why.append(f"gender={o.get('gender')}")
        for k in ('title', 'notes'):
            if o.get(k) and DASH.search(o[k]):
                o[k] = DASH.sub('-', o[k]) if k == 'title' else DASH.sub(',', o[k])
        if o.get('entry_url') and BANNED.search(o['entry_url']):
            o['entry_url'] = None
        key = (o.get('club_id'), o.get('starts_on'), (o.get('title') or '').lower())
        if key in seen:
            why.append('duplicate')
        seen.add(key)
        if why:
            problems.append((o.get('club_id'), o.get('title'), o.get('starts_on'), ', '.join(why)))
            continue
        o['id'] = 'c-' + hashlib.md5(f"{o['club_id']}|{o['starts_on']}|{o['title'].lower()}".encode()).hexdigest()[:16]
        opens.append(o)


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    return "'" + str(v).replace("'", "''") + "'"


rows = []
for o in opens:
    vals = [o['id'], o['club_id'], o['title'], o['starts_on'], o.get('ends_on'), o['gender'], bool(o.get('seniors')), bool(o.get('juniors')),
            o.get('format'), o.get('holes'), o.get('entry'), o.get('fee_gbp'), o.get('fee_basis'), o.get('max_handicap'), o.get('start_time'),
            o.get('entry_url'), o['source_url'], o.get('notes'), o.get('entry_status'), o.get('entry_opens'), o.get('entry_closes')]
    rows.append('(' + ','.join(q(v) for v in vals) + ')')
print("""insert into public.competitions (id,club_id,host,lat,lng,title,starts_on,ends_on,gender,seniors,juniors,format,holes,entry,fee_gbp,fee_basis,max_handicap,start_time,entry_url,source_url,notes,entry_status,entry_opens,entry_closes,confirmed,active,first_seen,last_seen,updated_at)
select v.id,v.club_id,c.name,c.lat,c.lng,v.title,v.starts_on::date,v.ends_on::date,v.gender,v.seniors,v.juniors,v.format,v.holes::int,v.entry,v.fee::numeric,v.fee_basis,v.maxh::numeric,v.start_time,v.entry_url,v.source_url,v.notes,v.entry_status,v.eo::date,v.ec::date,true,true,now(),now(),now()
from (values
""" + ',\n'.join(rows) + """
) as v(id,club_id,title,starts_on,ends_on,gender,seniors,juniors,format,holes,entry,fee,fee_basis,maxh,start_time,entry_url,source_url,notes,entry_status,eo,ec)
join public.clubs c on c.id=v.club_id and c.active
where not exists (select 1 from public.competitions k where k.club_id=v.club_id and k.starts_on=v.starts_on::date and k.active)
on conflict (id) do nothing
returning id;""")
print(f'{len(opens)} opens ready, {len(problems)} left out', file=sys.stderr)
for p in problems:
    print('  left out:', p, file=sys.stderr)
