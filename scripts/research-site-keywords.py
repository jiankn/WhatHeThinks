"""Use the observed Web.Cafe site-keywords UI API, with in-memory credentials."""
import importlib.util,json,re,time
from pathlib import Path
from http.cookiejar import CookieJar
from urllib.request import Request,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
out=Path('docs/seo-competitor-round2-2026-09-19')
spec=importlib.util.spec_from_file_location('kd',Path.home()/'.codex/skills/keyword-difficulty/scripts/estimate_keyword_difficulty.py');kd=importlib.util.module_from_spec(spec);spec.loader.exec_module(kd)
token=kd.get_token()
for domain in ['lucen.app','chatvisor.ai','decodethistext.com']:
    path=out/('rankings-'+domain+'.json')
    if path.exists():print(domain,'saved; no query',flush=True);continue
    opener=build_opener(HTTPCookieProcessor(CookieJar()))
    s=opener.open(Request('https://seo.web.cafe/sitekw/',headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
    m=re.search(r'<meta name="sk-token" content="([^"]+)"',s)
    if not m:raise RuntimeError('Public request token missing')
    req=Request('https://seo.web.cafe/sitekw/api/keywords',data=json.dumps({'target':domain,'gl':'us','orderBy':'etv','limit':50}).encode(),headers={'User-Agent':'Mozilla/5.0','Content-Type':'application/json','X-SK-Token':m[1],'Authorization':'Bearer '+token,'Referer':'https://seo.web.cafe/sitekw/'})
    try:
        with opener.open(req,timeout=60) as r:d=json.load(r)
    except HTTPError as e:
        error=e.read().decode()
        (out/'sitekw-error.json').write_text(json.dumps({'domain':domain,'status':e.code,'error':error}),encoding='utf-8')
        print(domain,e.code,error[:500],flush=True);break
    path.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'domain':domain,'total':d.get('total'),'charged':d.get('charged'),'cost':d.get('cost'),'returned':len(d.get('items') or [])},ensure_ascii=False),flush=True)
    time.sleep(6.2)
