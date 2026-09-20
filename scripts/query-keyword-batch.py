"""One cached 1000-keyword DataForSEO Google Ads query, credentials kept in memory."""
import argparse, base64, csv, ctypes, hashlib, json, os
from ctypes import wintypes
from pathlib import Path
from urllib.request import Request, urlopen

OUT=Path('docs/seo-research-2026-09-19')
def credentials():
    class Cred(ctypes.Structure):
        _fields_=[('Flags',wintypes.DWORD),('Type',wintypes.DWORD),('TargetName',wintypes.LPWSTR),('Comment',wintypes.LPWSTR),('LastWritten',wintypes.FILETIME),('CredentialBlobSize',wintypes.DWORD),('CredentialBlob',ctypes.POINTER(ctypes.c_ubyte)),('Persist',wintypes.DWORD),('AttributeCount',wintypes.DWORD),('Attributes',ctypes.c_void_p),('TargetAlias',wintypes.LPWSTR),('UserName',wintypes.LPWSTR)]
    api=ctypes.WinDLL('Advapi32.dll',use_last_error=True)
    api.CredReadW.argtypes=[wintypes.LPCWSTR,wintypes.DWORD,wintypes.DWORD,ctypes.POINTER(ctypes.POINTER(Cred))]
    api.CredReadW.restype=wintypes.BOOL
    api.CredFree.argtypes=[ctypes.c_void_p]
    ptr=ctypes.POINTER(Cred)()
    if not api.CredReadW('DataForSEO API',1,0,ctypes.byref(ptr)):raise RuntimeError('DataForSEO credential unavailable')
    try:
        user=ptr.contents.UserName
        password=ctypes.string_at(ptr.contents.CredentialBlob,ptr.contents.CredentialBlobSize).decode('utf-16-le').rstrip('\0')
        if password.startswith('{'):
            obj=json.loads(password);user=obj.get('login') or obj.get('username') or user;password=obj.get('password')
        if not user or not password:raise RuntimeError('Credential needs login and password')
        return user,password
    finally:api.CredFree(ptr)

ap=argparse.ArgumentParser();ap.add_argument('--confirm-live',action='store_true');ap.add_argument('--output-dir',type=Path,default=OUT);args=ap.parse_args()
OUT=args.output_dir
rows=list(csv.DictReader((OUT/'batch-1000.csv').open(encoding='utf-8-sig')))
keywords=[r['keyword'] for r in rows]
assert len(keywords)==len(set(keywords))==1000,'Require exactly 1000 unique relevant keywords'
assert all(len(k)<=80 and len(k.split())<=10 for k in keywords)
payload=[dict(keywords=keywords,location_code=2840,language_code='en',search_partners=False)]
body=json.dumps(payload).encode();digest=hashlib.sha256(body).hexdigest()
response_path=OUT/'dataforseo-response.json'
marker=OUT/'request-sha256.txt'
print(json.dumps(dict(keywords=1000,planned_billable_calls=1,estimated_cost_usd=0.09,location='United States',language='English',endpoint='keywords_data/google_ads/search_volume/live')))
if not args.confirm_live:raise SystemExit(0)
if response_path.exists():
    if not marker.exists() or marker.read_text()!=digest:raise RuntimeError('Existing response belongs to different request; refusing replacement')
    data=json.loads(response_path.read_text());print('Using saved response; no API call')
else:
    if marker.exists():raise RuntimeError('Previous attempt has uncertain outcome; refusing automatic paid retry')
    user,password=credentials()
    token=base64.b64encode((user+':'+password).encode()).decode()
    request=Request('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',data=body,headers={'Authorization':'Basic '+token,'Content-Type':'application/json'})
    marker.write_text(digest)
    with urlopen(request,timeout=120) as response:data=json.load(response)
    response_path.write_text(json.dumps(data,indent=2),encoding='utf-8')
tasks=data.get('tasks') or []
print(json.dumps({'status_code':data.get('status_code'),'cost_usd':data.get('cost'),'tasks':[{'status_code':t.get('status_code'),'status_message':t.get('status_message'),'results':len(t.get('result') or [])} for t in tasks]}))
if data.get('status_code')!=20000 or any(t.get('status_code')!=20000 for t in tasks):raise SystemExit(1)
metrics={r['keyword']:r for t in tasks for r in (t.get('result') or [])}
fields=list(rows[0])+['search_volume_us','cpc_usd','paid_competition','paid_competition_index','seo_kd','metric_status']
with (OUT/'validated-keywords.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
    for r in rows:
        m=metrics.get(r['keyword'],{})
        w.writerow({**r,'search_volume_us':m.get('search_volume'),'cpc_usd':m.get('cpc'),'paid_competition':m.get('competition'),'paid_competition_index':m.get('competition_index'),'seo_kd':'not queried','metric_status':'available' if m.get('search_volume') is not None else 'unavailable (not zero)'})
