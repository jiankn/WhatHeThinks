"""Second research pool: adjacent relationship intents, autocomplete and unqueried backlog."""
import csv,json,re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.parse import urlencode
OUT=Path('docs/seo-competitor-round2-2026-09-19');OUT.mkdir(exist_ok=True)
OLD=Path('docs/seo-research-2026-09-19')
groups={
'talking-stage':'talking stage|talking stage meaning|talking stage rules|how long should the talking stage last|talking stage vs dating|talking stage red flags|talking stage questions|how often should you text in the talking stage|failed talking stage|how to end a talking stage|how to know if talking stage is going well|exclusive talking stage',
'ghosting':'ghosting|ghosting meaning|why do guys ghost|why did he ghost me|am i being ghosted|being ghosted|what to do when you get ghosted|how to respond to ghosting|ghosting after first date|ghosting after a good date|ghosting after months of dating|soft ghosting|slow fading|ghosting vs slow fading|ghosting vs needing space|he came back after ghosting|why do ghosters come back|what to text someone who ghosted you',
'texting':'texting habits|texting in a relationship|texting etiquette dating|how often should couples text|how often should a guy text you|how to stop overthinking texts|texting anxiety|texting chemistry|bad texter or not interested|dry texter|how to respond to dry texts|how to not be a dry texter|dry texting vs not interested|double texting rules|is double texting bad|should i double text|how long to wait before double texting|texting after first date|texting after second date|when to text after a first date|good morning texts meaning|good night texts meaning|he only texts when i stop texting|he watches my stories but doesnt text|he is online but not replying',
'interest':'signs a guy likes you|signs he likes you but is hiding it|signs he secretly likes you|signs he likes you more than a friend|signs he is not interested|signs he is just not that into you|signs he is using you|does he love me|does he miss me|does he care about me|is he playing me|is he leading me on|am i being led on|is he stringing me along|signs he wants a relationship|signs he wants something serious|signs he is emotionally invested|signs he is catching feelings|is he flirting|flirting over text|flirty texts|flirty text messages|how to flirt over text|flirting vs being friendly',
'effort':'one sided relationship|one sided relationship signs|one sided love|unequal effort in a relationship|lack of effort in a relationship|bare minimum in a relationship|reciprocity in relationships|emotional availability|emotionally unavailable men|emotionally unavailable partner|emotional connection|emotional intimacy|emotional distance in a relationship|emotional needs in a relationship|relationship uncertainty|relationship clarity|relationship communication|communication problems in relationships|healthy communication in relationships|relationship check in questions|relationship expectations|relationship boundaries',
'signals':'red flags in a relationship|green flags in a relationship|red flags in men|green flags in men|texting red flags|love bombing|love bombing signs|love bombing examples|love bombing vs genuine interest|love bombing texts|future faking|future faking examples|hot and cold behavior|push pull relationship|benching in dating|orbiting meaning dating|paperclipping dating|pocketing dating|zombieing dating|situationship signs|situationship vs friends with benefits|how to end a situationship|how to get over a situationship|how to turn a situationship into a relationship',
'ex':'no contact rule|no contact rule after breakup|does no contact work|what to do when your ex texts you|how to respond to an ex|ex texts out of the blue|ex wants to meet up|ex says happy birthday|ex texting breadcrumbs|ex reaching out for closure|closure after breakup|mixed signals from ex|signs your ex still loves you|signs your ex misses you|signs your ex has moved on|should i text my ex|should i get back with my ex',
'long-distance':'long distance relationship|long distance relationship communication|long distance relationship texting|long distance relationship red flags|long distance relationship questions|long distance relationship losing interest|how often should long distance couples talk|boyfriend stopped texting|boyfriend ignoring texts|boyfriend emotionally distant|husband emotionally distant|how to ask where a relationship is going',
'friendship-expansion':'one sided friendship|signs of a one sided friendship|friendship red flags|toxic friendship signs|friendship compatibility|friendship test|best friend quiz|friendship communication|friendship falling apart|friend stopped texting|friendship analyzer|group chat analyzer|group chat statistics|group chat personality|chat roast|roast my chat|whatsapp wrapped|imessage wrapped|chat wrapped|relationship wrapped|family communication|family group chat',
'tools':'ai chat analyzer|ai text message analyzer|ai relationship advice|relationship advice ai|relationship compatibility test|relationship test|relationship quiz|love calculator|love compatibility test|crush calculator|crush test|texting compatibility|relationship compatibility|couple compatibility test|chatgpt relationship advice|analyze relationship with chatgpt|chatgpt text analysis|whatsapp analyzer|whatsapp stats|imessage analyzer|imessage chat statistics|text message statistics|conversation analysis ai|relationship red flag checker|text message decoder|what does this text mean|text tone analyzer',
}
seeds=[]
for cluster,words in groups.items():
    for k in words.split('|'):seeds.append(dict(keyword=k,cluster=cluster,page='TBD',source='editorial competitor-adjacent seed',business_fit=40 if cluster=='friendship-expansion' else 75))
cache_dir=Path.home()/'.agent-reach/whathethinks-round2';cache_dir.mkdir(parents=True,exist_ok=True)
cp=cache_dir/'suggestions.json';cache=json.loads(cp.read_text()) if cp.exists() else {}
def fetch(q):
    if q in cache:return q,cache[q]
    try:
        with urlopen('https://suggestqueries.google.com/complete/search?'+urlencode(dict(client='firefox',hl='en',gl='us',q=q)),timeout=12) as r:return q,json.load(r)[1]
    except Exception:return q,[]
queries=[s['keyword']+suffix for s in seeds for suffix in ('',' a',' h')]
with ThreadPoolExecutor(max_workers=8) as pool:
    for i,(q,items) in enumerate(pool.map(fetch,queries)):
        cache[q]=items
        if i%100==0:
            cp.write_text(json.dumps(cache),encoding='utf-8');print('Suggestions',i,'/',len(queries),flush=True)
cp.write_text(json.dumps(cache),encoding='utf-8')
previous={r['keyword'] for r in csv.DictReader((OLD/'batch-1000.csv').open(encoding='utf-8-sig'))}
rows={s['keyword']:s for s in seeds if s['keyword'] not in previous}
for s in seeds:
    for suffix in ('',' a',' h'):
        for k in cache.get(s['keyword']+suffix,[]):
            k=re.sub(r'\s+',' ',k.lower()).strip()
            if k not in previous and k not in rows and k.isascii() and len(k)<=80 and len(k.split())<=10:
                rows[k]={**s,'keyword':k,'source':'Google autocomplete: '+s['keyword']+suffix}
for r in csv.DictReader((OLD/'reviewed-pool.csv').open(encoding='utf-8-sig')):
    if r['keyword'] not in previous and r['keyword'] not in rows:rows[r['keyword']]={**r,'source':'unqueried first-round backlog; '+r['source']}
with (OUT/'expanded-candidates.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=list(seeds[0]));w.writeheader();w.writerows(rows.values())
print(json.dumps({'new_candidates':len(rows),'seed_count':len(seeds),'previous_keywords_excluded':len(previous)}),flush=True)
