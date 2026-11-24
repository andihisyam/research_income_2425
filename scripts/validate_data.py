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
lab_components=[c for c in d['components'] if c['manager']=='Laboratorium']
assert lab_components and all(c['sourceStandard']=='Laboratorium' for c in lab_components)
assert not any(c['sourceStandard']=='Belum teridentifikasi' for c in lab_components)
import csv
rev=Path(__file__).resolve().parents[2]/'PHASE3_FRACTIONAL_ATTRIBUTION_REVISION/PROJECT_LECTURER_LINKS/project_lecturer_links.csv'
with rev.open(encoding='utf-8-sig',newline='') as f: source_links=list(csv.DictReader(f))
assert any(x['UniID']=='USER-ARIS-PURWANTO' and x['matched_name']=='Aris Purwanto' for x in source_links)
assert not any(x['UniID']=='sp239' and 'Aris Purwanto' in x['matched_name'] for x in source_links)
allocated=d['qa']['fraction_matched']+d['qa']['fraction_unallocated']+d['qa']['projects_without_names_value']
assert abs(allocated-46545945693)<1
mapped_dashboard=sum(x['fractionalValue'] for p in d['projects'] for x in p['people'] if x['matched'])
assert abs(mapped_dashboard-d['qa']['fraction_matched'])<0.01
assert abs((sum(c['value'] for c in d['components'])-mapped_dashboard)-d['qa']['projects_without_names_value'])<0.01
assert d['qa']['fraction_unallocated']==0
lab_projects=[p for p in d['projects'] if p['manager']=='Laboratorium']
assert len(lab_projects)==24 and all(p.get('ownerFaculty') and p.get('ownerProdi') for p in lab_projects)
assert abs(sum(p['value'] for p in lab_projects)-d['qa']['projects_without_names_value'])<0.01
lab_by_faculty=defaultdict(int)
for p in lab_projects: lab_by_faculty[p['ownerFaculty']]+=p['value']
assert dict(lab_by_faculty)=={'FT':571135000,'FKIP':74472500,'FF':630961413,'FIK':11991000,'FK':260907060,'Fapsi':79523242}
print('VALID: baseline 2024/2025, kategori, ID unik, relasi, dan bucket atribusi rekonsiliasi 100%.')
