"""Build a research pool from intent seeds and public Google suggestions; no paid API."""
import csv, json, re, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.parse import urlencode

OUT = Path('docs/seo-research-2026-09-19')
OUT.mkdir(exist_ok=True)
groups = {
'home': ('/', 'relationship text analyzer|relationship chat analyzer|ai text analyzer|dating text analyzer|ai relationship analyzer|analyze text messages|text message analyzer|conversation analyzer|relationship analysis|texting analysis|chat analysis ai|love text analyzer|analyze his texts|what does his text mean|decode his texts|text message interpretation|dating chat analysis'),
'interest': ('/does-he-like-me-text-analyzer', 'does he like me|does he like me over text|signs he likes you over text|is he flirting or being friendly|does he like me quiz|does he like me test|how to tell if a guy likes you over text|is he interested in me|does he like me or just want attention|does he like me or is he bored|signs a guy is interested through text|how guys text when they like you|does my crush like me|is he into me|is he just being nice'),
'losing': ('/is-he-losing-interest', 'is he losing interest|signs he is losing interest|is he losing interest or just busy|why is he texting less|why are his replies getting shorter|why did he stop initiating texts|signs he is pulling away|he used to text me everyday|he stopped texting me|why is he being distant|he takes longer to reply|is he bored of me|is he slow fading|slow fade texting|dry texting|one word replies|he never asks me questions|he stopped making plans|he texts less after first date|he went cold after second date'),
'mixed': ('/mixed-signals-text-analyzer', 'mixed signals|mixed signals from a guy|mixed signals over text|mixed signals text analyzer|hot and cold texting|inconsistent texting|he texts me but never makes plans|he says he likes me but|he acts interested then disappears|he texts first then ignores me|he texts everyday but never asks me out|he flirts then pulls away|is he interested or just lonely|he texts at night only|he leaves me on read|he leaves me on delivered|ghosting or just busy|why does he ignore my texts'),
'situationship': ('/situationship-analyzer', 'situationship|situationship analyzer|situationship quiz|situationship test|am i in a situationship|signs of a situationship|situationship texting|situationship vs relationship|is my situationship going nowhere|signs a situationship is ending|does my situationship like me|why wont he commit|is he serious about me|does he want a relationship|situationship red flags|situationship communication|one sided situationship|situationship boundaries|define the relationship|where is this relationship going'),
'breadcrumb': ('/breadcrumbing-test', 'breadcrumbing|breadcrumbing test|breadcrumbing quiz|breadcrumbing texts|breadcrumbing examples|is he breadcrumbing me|signs of breadcrumbing|breadcrumbing vs genuine interest|breadcrumbing vs ghosting|breadcrumbing or busy|how to respond to breadcrumbing|he keeps coming back but wont commit|he sends random texts|he texts but doesnt follow through|orbiting dating|benching dating|he keeps me as an option'),
'ex': ('/ex-text-analyzer', 'ex text analyzer|why is my ex texting me|does my ex want me back|signs your ex wants you back|ex reaching out|ex text messages|ex texts after no contact|ex breadcrumbing|is my ex testing me|does my ex miss me|ex checking in|ex says he misses me|ex wants to be friends|ex hot and cold|should i reply to my ex|ex texts then disappears|ex says hey|ex drunk texting|ex apologizes over text'),
'whatsapp': ('/whatsapp-relationship-analyzer', 'whatsapp chat analyzer|whatsapp relationship analyzer|whatsapp chat analysis|whatsapp chat statistics|whatsapp conversation analyzer|whatsapp love analyzer|whatsapp text analyzer|whatsapp chat insights|whatsapp chat sentiment analysis|whatsapp chat export analysis|whatsapp relationship analysis|analyze whatsapp chat online|whatsapp chat analyzer privacy|export whatsapp chat'),
'initiation': ('/who-texts-first', 'who texts first|who texts first calculator|who texts more|who texts more calculator|who initiates conversation|texting effort calculator|texting balance|one sided texting|i always text first|he never texts first|should i stop texting first|why do i always initiate conversations|he replies but never initiates|double texting|should i text him first|equal effort in texting|whatsapp message counter'),
'reply': ('/reply-time-calculator', 'reply time calculator|response time calculator|average reply time|text response time|whatsapp reply time|how long should he take to reply|slow replies|fast replies|he takes hours to reply|he takes days to reply|texting response time and interest|average text response time dating|how long to wait for a text back|why does he take so long to reply|he replies fast but short|left on read meaning'),
'platform': ('/analyze', 'imessage text analyzer|imessage relationship analyzer|instagram dm analyzer|instagram relationship analyzer|messenger chat analyzer|telegram chat analyzer|paste text messages analyzer|copy text messages for analysis'),
}
seeds=[]
for cluster,(page,phrases) in groups.items():
    for phrase in phrases.split('|'):
        seeds.append(dict(keyword=phrase,cluster=cluster,page=page,source='editorial seed',business_fit=95 if cluster not in ('platform','reply','initiation') else 85))
cache_path=OUT/'suggestions-cache.json'
cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
def fetch(q):
    if q in cache:return q,cache[q]
    try:
        with urlopen('https://suggestqueries.google.com/complete/search?'+urlencode(dict(client='firefox',hl='en',gl='us',q=q)),timeout=15) as r:
            return q,json.load(r)[1]
    except Exception:return q,[]
queries=[s['keyword'] for s in seeds]
queries += [s['keyword']+' '+p for s in seeds for p in ('a','h','w')]
with ThreadPoolExecutor(max_workers=6) as pool:
    for q,items in pool.map(fetch,queries):cache[q]=items
cache_path.write_text(json.dumps(cache,ensure_ascii=False,indent=2),encoding='utf-8')
rows={s['keyword']:s for s in seeds}
exclude=r'\b(reddit|quora|tiktok|pinterest|youtube|song|lyrics|movie|book|pdf|in hindi|in tamil|in urdu|in telugu|in spanish|in bengali|meaning in|github|python|javascript|download|apk|mod|crack|attachment style|narcissist|autism|adhd|bpd|avoidant|screenshot|snapchat|discord|cheating|cheat|detector|therapy|therapist|abuse|suicide)\b'
for s in seeds:
    for q in [s['keyword']]+[s['keyword']+' '+p for p in ('a','h','w')]:
        for k in cache.get(q,[]):
            k=re.sub(r'\s+',' ',k.lower()).strip()
            if not k.isascii() or len(k)>80 or len(k.split())>10 or re.search(exclude,k):continue
            if k not in rows:rows[k]={**s,'keyword':k,'source':'Google autocomplete: '+q}
with (OUT/'candidate-pool.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=list(seeds[0]));w.writeheader();w.writerows(rows.values())
print(json.dumps({'candidates':len(rows),'editorial_seeds':len(seeds),'suggestion_queries':len(queries),'clusters':{c:sum(r['cluster']==c for r in rows.values()) for c in groups}}))
