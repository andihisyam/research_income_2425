#!/usr/bin/env python3
"""Bangun snapshot JSON dasbor dari keluaran revisi Phase 3 terbaru."""
from __future__ import annotations
import csv, json, re, hashlib
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT.parent
REV=WORK/'PHASE3_FRACTIONAL_ATTRIBUTION_REVISION'
OUT=ROOT/'public'/'data'
OUT.mkdir(parents=True,exist_ok=True)

def rows(path):
    with path.open(encoding='utf-8-sig',newline='') as f: return list(csv.DictReader(f))
def n(v):
    try:return int(round(float(v or 0)))
    except:return 0
def f(v):
    try:return float(v or 0)
    except:return 0.0
def metric(v):
    try:return float(v) if str(v).strip() else None
    except:return None
def clean(v, fallback='Belum teridentifikasi'):
    v=re.sub(r'\s+',' ',str(v or '')).strip()
    return v or fallback

def source_label(funder, manager):
    funder=clean(funder,'')
    if funder: return funder
    if clean(manager,'').lower()=='laboratorium': return 'Laboratorium'
    return 'Belum teridentifikasi'

LAB_FACULTY_BY_UNIT={
    'Arsitektur':'FT',
    'FKIP':'FKIP',
    'Farmasi':'FF',
    'Fisioterapi':'FIK',
    'Ilmu Gizi':'FIK',
    'Kedokteran':'FK',
    'Kesehatan Masyarakat':'FIK',
    'Pendidikan Bahasa dan Sastra Indonesia':'FKIP',
    'Pendidikan Biologi':'FKIP',
    'Psikologi':'Fapsi',
    'Teknik Mesin':'FT',
    'Teknik Sipil':'FT',
}
LAB_CANONICAL_PRODI={
    'Arsitektur':'Program Studi Arsitektur',
    'FKIP':'FKIP',
    'Farmasi':'Program Studi Farmasi',
    'Fisioterapi':'Program Studi Fisioterapi',
    'Ilmu Gizi':'Program Studi Ilmu Gizi',
    'Kedokteran':'Program Studi Pendidikan Dokter',
    'Kesehatan Masyarakat':'Program Studi Kesehatan Masyarakat',
    'Pendidikan Bahasa dan Sastra Indonesia':'Program Studi Pendidikan Bahasa dan Sastra Indonesia',
    'Pendidikan Biologi':'Program Studi Pendidikan Biologi',
    'Psikologi':'Program Studi Psikologi',
    'Teknik Mesin':'Program Studi Teknik Mesin',
    'Teknik Sipil':'Program Studi Teknik Sipil',
}

def main():
    comp_all=rows(REV/'PROJECT_LEVEL_DATA'/'project_components.csv')
    comps=[]
    for r in comp_all:
        if clean(r['Masuk Aggregated?'],'').lower()!='ya': continue
        cat={'Industry':'Industri','Non Industry':'Non-Industri'}.get(clean(r['Kategori Agregat'],''),'Belum diklasifikasi')
        raw=source_label(r['Lembaga Pemberi Dana'],r['Unit Pengelola'])
        std=raw
        note='Label sumber terstandar dari teks sumber.'
        if std=='Laboratorium': note='Pendapatan pengguna laboratorium; nama pemberi dana tidak tersedia pada sumber.'
        if std.upper()=='DPPM': note='DPPM tercatat pada sumber; peran sebagai pemberi dana akhir belum diverifikasi.'
        comps.append({'componentId':r['component_id'],'projectId':r['project_id'],'year':n(r['Tahun']),'month':clean(r['Bulan'],'—'),'manager':clean(r['Unit Pengelola']),'subject':clean(r['THE Subject Area'],'Belum terpetakan'),'program':clean(r['Skema Pendanaan']),'sourceRaw':raw,'sourceStandard':std,'sourceNote':note,'category':cat,'value':n(r['Jumlah Dana (IDR)']),'sourceCell':clean(r['Kolom Sumber'],'—')})
    valid_ids={x['projectId'] for x in comps}
    project_rows=rows(REV/'PROJECT_LEVEL_DATA'/'project_level.csv')
    links_all=rows(REV/'PROJECT_LECTURER_LINKS'/'project_lecturer_links.csv')
    research_by_id={r['UniID']:r for r in rows(REV/'REVISED_ANALYSIS'/'lecturer_funding_summary.csv') if r.get('UniID')}
    links_by=defaultdict(list)
    for r in links_all:
        if r['project_id'] not in valid_ids: continue
        matched=r['match_status'].startswith('matched') and bool(r.get('UniID'))
        source_key=r.get('UniID') or f"UNMATCHED-{clean(r.get('extracted_name'))}"
        public_key='PERSON-'+hashlib.sha256(source_key.encode()).hexdigest()[:12].upper()
        research=research_by_id.get(r.get('UniID'),{}) if matched else {}
        links_by[r['project_id']].append({'personKey':public_key,'name':clean(r.get('matched_name') if matched else r.get('extracted_name'),'Nama belum terpetakan'),'faculty':clean(r.get('faculty'),'Belum terpetakan') if matched else 'Belum terpetakan','prodi':clean(r.get('prodi'),'Belum terpetakan') if matched else 'Belum terpetakan','personType':clean(r.get('person_type'),'Belum terverifikasi'),'matchStatus':r['match_status'],'matched':matched,'fractionalValue':f(r.get('allocated_to_matched')) if matched else f(r.get('unallocated_fraction')),'hIndex':metric(research.get('h-index')),'scholarlyOutput':metric(research.get('Scholarly Output (kumulatif)')),'citations':metric(research.get('Citations (kumulatif)')),'paper2024':metric(research.get('Paper 2024')),'paper2025':metric(research.get('Paper 2025'))})
    component_by=defaultdict(list)
    for c in comps: component_by[c['projectId']].append(c)
    projects=[]
    for r in project_rows:
        pid=r['project_id']
        if pid not in valid_ids: continue
        cs=component_by[pid]; people=links_by.get(pid,[])
        value=sum(x['value'] for x in cs)
        manager=clean(r['unit_pengelola'])
        owner_unit=clean(r['prodi_unit'],'') if manager=='Laboratorium' else ''
        owner_faculty=LAB_FACULTY_BY_UNIT.get(owner_unit,'') if owner_unit else ''
        owner_prodi=LAB_CANONICAL_PRODI.get(owner_unit,'') if owner_unit else ''
        if manager=='Laboratorium' and (not owner_faculty or not owner_prodi):
            raise ValueError(f'Unit laboratorium belum memiliki pemetaan fakultas/prodi: {owner_unit!r} ({pid})')
        faculties=[owner_faculty] if owner_faculty else (sorted(set(x['faculty'] for x in people)) or ['Belum terpetakan'])
        prodis=[owner_prodi] if owner_prodi else (sorted(set(x['prodi'] for x in people)) or ['Belum terpetakan'])
        projects.append({'projectId':pid,'year':n(r['year']),'title':clean(r['title'],'Judul belum tersedia'),'manager':manager,'subject':clean(r['the_subject_area'],'Belum terpetakan'),'program':clean(r['scheme']),'sourceRaw':source_label(r['funder'],r['unit_pengelola']),'sourceStandard':source_label(r['funder'],r['unit_pengelola']),'categories':sorted(set(x['category'] for x in cs)),'value':value,'componentCount':len(cs),'people':people,'internalPeopleNames':[x['name'] for x in people],'faculties':faculties,'prodis':prodis,'ownerFaculty':owner_faculty,'ownerProdi':owner_prodi})
    annual=[]
    for y in (2024,2025):
        yc=[x for x in comps if x['year']==y]
        annual.append({'year':y,'total':sum(x['value'] for x in yc),'industry':sum(x['value'] for x in yc if x['category']=='Industri'),'nonIndustry':sum(x['value'] for x in yc if x['category']=='Non-Industri'),'unclassified':sum(x['value'] for x in yc if x['category']=='Belum diklasifikasi')})
    metrics=json.loads((REV/'MATCHING_QA'/'qa_metrics.json').read_text())
    faculty_profiles=[{'faculty':r['faculty'],'allLecturers':n(r.get('all_lecturers')),'uniqueInvolved':n(r.get('unique_involved')),'participationRate':f(r.get('participation_rate')),'medianFractional':f(r.get('median_fractional'))} for r in rows(REV/'REVISED_ANALYSIS'/'faculty_analysis.csv') if r.get('faculty')]
    payload={'generatedAt':datetime.now().astimezone().isoformat(timespec='seconds'),'sourceRevisionMtime':datetime.fromtimestamp((REV/'PROJECT_LEVEL_DATA'/'project_level.csv').stat().st_mtime).astimezone().isoformat(timespec='seconds'),'annual':annual,'components':comps,'projects':projects,'facultyProfiles':faculty_profiles,'qa':metrics,'groupingMethod':'ID proyek dibentuk konservatif dari tahun, unit pengelola, judul ternormalisasi, sheet sumber, dan baris sumber; baris hanya digabung bila seluruh kunci sama. Karena deduplikasi lintas sumber belum dibuktikan independen, jumlah ditulis sebagai proyek teridentifikasi.'}
    (OUT/'dashboard.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    metadata={'refreshDate':payload['generatedAt'],'sources':['Research Income _ Januari - Desember 24 dan 25.xlsx','Research_Income_Tracker_2024_2025.xlsx','Keluaran final PHASE3_FRACTIONAL_ATTRIBUTION_REVISION'],'baseline':annual,'coverage':{'matchedFraction':metrics['fraction_matched'],'unallocatedFraction':metrics['fraction_unallocated'],'withoutInternalNames':metrics['projects_without_names_value']},'limitations':['Snapshot statis, bukan data waktu nyata.','DPPM dapat mencerminkan unit/program yang tercatat; pemberi dana akhir tidak disimpulkan tanpa verifikasi.','Pendanaan proyek dipetakan secara proporsional melalui personel internal; pendapatan laboratorium dipetakan langsung melalui program studi/unit pemilik yang tercatat pada sumber.','Jumlah proyek adalah proyek teridentifikasi dengan pengelompokan konservatif, bukan klaim deduplikasi universal.']}
    (OUT/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"Terbangun: {len(comps)} komponen, {len(projects)} proyek teridentifikasi, {sum(len(p['people']) for p in projects)} relasi.")
if __name__=='__main__': main()
