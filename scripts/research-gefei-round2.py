"""Query explicitly requested Web.Cafe KD, save each response, reuse local results."""
import argparse,importlib.util,json,time
from pathlib import Path
from types import SimpleNamespace
OUT=Path('docs/seo-competitor-round2-2026-09-19');OUT.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('kd',Path.home()/'.codex/skills/keyword-difficulty/scripts/estimate_keyword_difficulty.py')
kd=importlib.util.module_from_spec(spec);spec.loader.exec_module(kd)
ap=argparse.ArgumentParser();ap.add_argument('keywords',nargs='+');ap.add_argument('--output-dir',type=Path,default=OUT);args=ap.parse_args()
OUT=args.output_dir;OUT.mkdir(exist_ok=True)
path=OUT/'gefei-results.json';saved=json.loads(path.read_text()) if path.exists() else {}
token=kd.get_token();opts=SimpleNamespace(gl='us',hl='en',format='json',force=False)
for index,keyword in enumerate(args.keywords):
    if keyword in saved:
        print(json.dumps({'keyword':keyword,'local_cache':True,'score':saved[keyword].get('score')}),flush=True);continue
    if index:time.sleep(6.2)
    try:r=kd.request_report_with_retry(keyword,opts,token)
    except kd.ApiError as e:
        print(json.dumps({'keyword':keyword,'status':e.status,'code':e.code,'error':e.message}),flush=True);break
    saved[keyword]=r;path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'keyword':keyword,'score':r.get('score'),'level':r.get('level'),'volume':r.get('keywordVolume'),'cached':r.get('cached'),'keys':list(r)},ensure_ascii=False),flush=True)
