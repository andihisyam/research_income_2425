#!/usr/bin/env python3
import json
from collections import Counter, defaultdict
from pathlib import Path
dashboard_path=Path(__file__).resolve().parents[1]/'public/data/dashboard.json'
d=json.loads(dashboard_path.read_text())
expected={2024:28184773665,2025:25029846528}
by_year=defaultdict(int); by_cat=defaultdict(int)
for c in d['components']:
    by_year[c['year']]+=c['value']; by_cat[(c['year'],c['category'])]+=c['value']
for y,v in expected.items():
    assert by_year[y]==v, (y,by_year[y],v)
    assert sum(vv for (yy,_),vv in by_cat.items() if yy==y)==v
assert sum(by_year.values())==53214620193
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
non_hit_total=sum(c['value'] for c in d['components'] if c['program']!='HIT')
assert abs((non_hit_total-mapped_dashboard)-d['qa']['projects_without_names_value'])<0.01
assert d['qa']['fraction_unallocated']==0
lab_projects=[p for p in d['projects'] if p['manager']=='Laboratorium']
assert len(lab_projects)==24 and all(p.get('ownerFaculty') and p.get('ownerProdi') for p in lab_projects)
assert all(p['ownerProdi']=='FKIP' or p['ownerProdi'].startswith('Program Studi ') for p in lab_projects)
assert abs(sum(p['value'] for p in lab_projects)-d['qa']['projects_without_names_value'])<0.01
lab_by_faculty=defaultdict(int)
for p in lab_projects: lab_by_faculty[p['ownerFaculty']]+=p['value']
assert dict(lab_by_faculty)=={'FT':571135000,'FKIP':74472500,'FF':630961413,'FIK':11991000,'FK':260907060,'Fapsi':79523242}
assert d.get('facultyProfiles') and any(x['faculty']=='FT' and x['allLecturers']==144 for x in d['facultyProfiles'])
assert any(x.get('hIndex') is not None for p in d['projects'] for x in p['people'] if x['matched'])
hit=json.loads((dashboard_path.parent/'hit_projects.json').read_text())
assert len(hit)==178
assert {x['year'] for x in hit}=={2024,2025}
assert {x['status'] for x in hit}=={'Disetujui','Laporan','Monev','Revisi Laporan','Selesai'}
assert sum(x['approvedValue'] for x in hit)==6668674500
hit_counts=Counter((x['year'],x['status']) for x in hit)
assert hit_counts==Counter({
    (2024,'Disetujui'):40,(2024,'Laporan'):23,(2024,'Monev'):19,
    (2024,'Revisi Laporan'):14,(2024,'Selesai'):16,
    (2025,'Disetujui'):14,(2025,'Laporan'):22,(2025,'Monev'):18,
    (2025,'Revisi Laporan'):2,(2025,'Selesai'):10,
})
assert {y:sum(x['approvedValue'] for x in hit if x['year']==y) for y in (2024,2025)}=={2024:4253250000,2025:2415424500}
dashboard_hit=[x for x in d['projects'] if x.get('program')=='HIT']
assert len(dashboard_hit)==178 and all(x.get('ownerFaculty') and x.get('ownerProdi') for x in dashboard_hit)
print('VALID: baseline 2024/2025, kategori, ID unik, relasi, dan bucket atribusi rekonsiliasi 100%.')
