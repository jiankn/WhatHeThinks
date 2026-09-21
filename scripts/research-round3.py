"""Expand fresh relationship search intents and select a non-overlapping batch."""
import ast,csv,json,re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.parse import urlencode
OUT=Path('docs/seo-round3-2026-09-21');OUT.mkdir(exist_ok=True)
groups={
'interest':'what he thinks|what is he thinking|what does he think of me|does he find me attractive|signs of attraction|signs of mutual attraction|does he have feelings for me|signs he wants you|signs he is falling for you|signs he loves you|signs he likes you but is scared|is he interested or just being nice|is he into me|is he serious about me|is he worth it|does he like me or is he bored|does he want a relationship|how to know if someone likes you|how to tell if someone is flirting|how to tell if a guy is flirting over text',
'conversation':'conversation starters|deep conversation starters|conversation starters for couples|conversation starters with your crush|questions to ask your crush|questions to ask a guy|questions to ask your boyfriend|deep questions to ask your boyfriend|flirty questions to ask a guy|relationship questions|questions to ask before dating|questions to ask in a new relationship|how to keep a conversation going|how to start a conversation over text|how to text a guy|what to text your crush|what to talk about with your boyfriend|how to get to know someone|getting to know you questions|how to ask a guy out',
'responses':'how to respond to hey|how to respond to wyd|how to respond to i miss you|how to respond to a compliment|how to respond to a flirty text|how to respond to good morning text|how to respond to an apology|how to respond to rejection|how to respond to no response|what to say when someone ignores you|how to tell someone you like them|how to tell someone you are not interested|how to ask someone what they want|how to ask are we exclusive|how to ask for clarity in a relationship',
'dating':'dating vs relationship|dating exclusively|exclusive relationship|casual dating|casual relationship|dating intentions|relationship stages|dating stages|relationship labels|relationship status|friends with benefits|friends with benefits rules|friends with benefits signs he likes you|dating red flags|early dating signs he likes you|dating green flags|first date questions|second date questions|third date|dating communication|how often to see someone you are dating|when to define the relationship|how to know if a date went well|signs of a good first date',
'distance':'he stopped texting me|he stopped texting but still likes my posts|why do guys pull away|why men pull away|he is distant|he is acting different|he ignores me|why is he ignoring me|why does he leave me on read|left on delivered|left on read|why does he take so long to reply|why do guys text less after a while|he texts me everyday|he texts me but never asks me out|he never texts first|he only texts at night|he says he likes me but|he says he is busy|he says he is not ready for a relationship|he needs space|how to give him space|when to stop texting a guy',
'patterns':'inconsistent communication|inconsistent texting|inconsistent behavior in relationships|emotional unavailability|unrequited love|unreciprocated love|feeling unwanted in a relationship|feeling disconnected from partner|feeling lonely in a relationship|feeling unappreciated in a relationship|emotional neglect in relationships|lack of affection in a relationship|lack of communication in a relationship|poor communication in relationships|relationship doubts|relationship compatibility signs|healthy relationship signs|unhealthy relationship signs|effort in a relationship|relationship deal breakers|relationship needs|reassurance in a relationship',
'breakup':'should i break up with my boyfriend|when to end a relationship|signs a relationship is over|how to end a relationship|how to move on from someone|how to get over a crush|how to stop liking someone|how to stop thinking about someone|how to stop chasing someone|how to detach from someone|how to let go of someone|how to get closure|why do i miss my ex|my ex texted me|my ex wants to be friends|should i reply to my ex|signs your ex wants you back|signs your ex is testing you|how to know if your ex still loves you',
'textmeaning':'flirting signs|flirting examples|banter flirting|playful teasing|flirty banter|texting chemistry signs|texting green flags|texting styles|romantic attraction|romantic interest|emotional attraction|emotional connection signs|chemistry between two people|romantic chemistry|platonic vs romantic|friendly vs flirty|pet names meaning|good morning text|good night text|thinking of you text|miss you text|heart emoji meaning from a guy|he calls me cute|he calls me beautiful',
}
old={r['keyword'] for r in csv.DictReader(open('docs/seo-competitor-round2-2026-09-19/combined-2000-keywords.csv',encoding='utf-8-sig'))}
scope={'re':re};tree=ast.parse(Path('scripts/select-round2-keywords.py').read_text())
# Reuse the existing reviewed exclusion vocabulary without executing its selection.
base={};bt=ast.parse(Path('scripts/select-keyword-batch.py').read_text())
for n in bt.body:
    if isinstance(n,(ast.Assign,ast.AugAssign)):
        names=[t.id for t in n.targets if isinstance(t,ast.Name)] if isinstance(n,ast.Assign) else [getattr(n.target,'id','')]
        if any(x in ('deny','extra_deny','exact_deny') for x in names):exec(compile(ast.Module(body=[n],type_ignores=[]),'filters','exec'),base)
scope['scope']=base
for n in tree.body:
    if isinstance(n,(ast.Assign,ast.AugAssign)):
        names=[t.id for t in n.targets if isinstance(t,ast.Name)] if isinstance(n,ast.Assign) else [getattr(n.target,'id','')]
        if 'block' in names:exec(compile(ast.Module(body=[n],type_ignores=[]),'filters','exec'),scope)
block=scope['block']+r'|\b(workplace|coworker|boss|work colleagues|interview|kids|children|students|school|team building|icebreaker games|party games|trivia|dirty|sexual|sexting|sexually|spicy|nudes|prayer|dua|prison|prisoner|lawyer|client|customer|sales|business|job|funeral|condolences|death|grief|bereavement)\b'
cachepath=Path.home()/'.agent-reach/whathethinks-round3/suggestions.json';cachepath.parent.mkdir(parents=True,exist_ok=True)
block+=r'|\b(deuce|hawthorne|spiritually|happiness|highs|hollywood|miami|parents|handout|houston|store|wheelies|wavelength|frequency|hat|aptitude|planned|harvesting|advertising|bookstore|closing|costs|israel|clothing|human design|keyboard|airpods|pearl|air force|haram|wichita|holiday party|documents|history jokes|hr|hkmori|wallpaper|pronunciation|dopamine|amulet|herbs|hosts|hz|lee williams|andre|hidah|holistic|wishful|alien stage|acotar|alchemised|networking|professionally|rejected application|rejection email|rejection letter|apology email|email|math|causal|band|records|autistic|pmdd|addict|alcoholic|healing|affirmations|teens|work|agency|weddings|wedding|women.s group)\b'
blocked_exact={'is you worth it','what he has said','what he said about','what he thought was','what is thinking aloud','what is thinking words','what she thinks about','is he man worth watching','what does it of mean','what he said to her','what he thinks he is','he needs space to move','love heat chemistry','love interest','love chemistry website','emotional attraction flag','relationship all stages'}
block+=r'|\b(love interest|wig|database|worthy|worth his salt|worksheets|workbook|workshop)\b'
cache=json.loads(cachepath.read_text()) if cachepath.exists() else {}
seeds=[dict(keyword=k,cluster=c,page='TBD',source='round3 editorial seed',business_fit=85 if c in ('interest','distance','responses','textmeaning') else 75) for c,ks in groups.items() for k in ks.split('|')]
suffixes=('',' a',' h',' w')
def fetch(q):
    if q in cache:return q,cache[q]
    try:
        with urlopen('https://suggestqueries.google.com/complete/search?'+urlencode(dict(client='firefox',hl='en',gl='us',q=q)),timeout=12) as r:return q,json.load(r)[1]
    except Exception:return q,[]
queries=[s['keyword']+x for s in seeds for x in suffixes]
with ThreadPoolExecutor(max_workers=8) as pool:
    for i,(q,items) in enumerate(pool.map(fetch,queries)):
        cache[q]=items
        if i%100==0:cachepath.write_text(json.dumps(cache));print('Autocomplete',i,'/',len(queries),flush=True)
cachepath.write_text(json.dumps(cache))
rows={}
def add(r):
    k=re.sub(r'\s+',' ',r['keyword'].lower()).strip()
    if k in old or k in rows or k in blocked_exact or len(k)>80 or len(k.split())>10 or re.search(block,k) or k in base['exact_deny'] or re.search(r'[^a-z0-9\s\x27-]',k):return
    rows[k]={**r,'keyword':k}
for s in seeds:add(s)
for s in seeds:
    for x in suffixes:
        for k in cache[s['keyword']+x]:add({**s,'keyword':k,'source':'Google autocomplete: '+s['keyword']+x})
for r in csv.DictReader(open('docs/seo-competitor-round2-2026-09-19/relevant-pool.csv',encoding='utf-8-sig')):
    if int(r['business_fit'])>=75:add({**r,'cluster':'backlog-'+r['cluster'],'source':'unqueried backlog; '+r['source']})
def write(name,rr):
    with (OUT/name).open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=list(seeds[0]));w.writeheader();w.writerows(rr)
write('relevant-pool.csv',rows.values())
selected=[r for r in rows.values() if r['source']=='round3 editorial seed']
queues={c:sorted([r for r in rows.values() if r['cluster']==c and r not in selected],key=lambda r:(len(r['keyword'].split()),r['keyword'])) for c in dict.fromkeys(r['cluster'] for r in rows.values())}
while len(selected)<1000:
    before=len(selected)
    for c,rr in queues.items():
        cap=25 if c.startswith('backlog-') else 150
        if rr and sum(r['cluster']==c for r in selected)<cap and len(selected)<1000:selected.append(rr.pop(0))
    if len(selected)==before:break
assert len(selected)==len({r['keyword'] for r in selected})==1000
assert not old.intersection(r['keyword'] for r in selected)
write('batch-1000.csv',selected)
print(json.dumps(dict(seeds=len(seeds),suggestion_queries=len(queries),relevant_candidates=len(rows),selected=len(selected),previous_excluded=len(old))))
