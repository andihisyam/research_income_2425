#!/usr/bin/env python3
import json
from collections import defaultdict
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/data/dashboard.json'
d=json.loads(p.read_text())
expected={2024:23931523665,2025:22614422028}
by_year=defaultdict(int); by_cat=defaultdict(int)
for c in d['components']:
    by_year[c['year']]+=c['value']; by_cat[(c['year'],c['category'])]+=c['value']
for y,v in expected.items():
    assert by_year[y]==v, (y,by_year[y],v)
    assert sum(vv for (yy,_),vv in by_cat.items() if yy==y)==v
assert sum(by_year.values())==46545945693
assert all(a['total']==expected[a['year']] for a in d['annual'])
assert len({p['projectId'] for p in d['projects']})==len(d['projects'])
assert len({c['componentId'] for c in d['components']})==len(d['components'])
assert all(c['projectId'] in {p['projectId'] for p in d['projects']} for c in d['components'])
import csv
rev=Path(__file__).resolve().parents[2]/'PHASE3_FRACTIONAL_ATTRIBUTION_REVISION/PROJECT_LECTURER_LINKS/project_lecturer_links.csv'
with rev.open(encoding='utf-8-sig',newline='') as f: source_links=list(csv.DictReader(f))
assert any(x['UniID']=='USER-ARIS-PURWANTO' and x['matched_name']=='Aris Purwanto' for x in source_links)
assert not any(x['UniID']=='sp239' and 'Aris Purwanto' in x['matched_name'] for x in source_links)
allocated=d['qa']['fraction_matched']+d['qa']['fraction_unallocated']+d['qa']['projects_without_names_value']
assert abs(allocated-46545945693)<1
print('VALID: baseline 2024/2025, kategori, ID unik, relasi, dan bucket atribusi rekonsiliasi 100%.')
