import ast,csv,re
from pathlib import Path
from collections import Counter
out=Path('docs/seo-competitor-round2-2026-09-19')
scope={}
tree=ast.parse(Path('scripts/select-keyword-batch.py').read_text())
for n in tree.body:
    if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ('deny','extra_deny','exact_deny') for t in n.targets):exec(compile(ast.Module(body=[n],type_ignores=[]),'filters','exec'),scope)
    if isinstance(n,ast.AugAssign) and isinstance(n.target,ast.Name) and n.target.id=='extra_deny':exec(compile(ast.Module(body=[n],type_ignores=[]),'filters','exec'),scope)
block=scope['deny']+'|'+scope['extra_deny']+r'|\b(reddit|quora|pinterest|tiktok|youtube|lyrics|song|songs|movie|movies|book|books|pdf|download|apk|github|python|javascript|narcissist|autism|adhd|bpd|avoidant|attachment|screenshot|diagnosis|therapy|therapist|counseling|counselling|suicide|abuse|abusive|cheat|cheating|detector|horror|haunting|monitor|screen|gpu|gaming|minecraft|gameplay|grades|worksheet|romance novel|author|tropes|fiction|chapters|epub|quizlet|wordwall|biology|zodiac|astrology|astrological|calculator names|calculator by name|name calculator|by name|birth date|date of birth|birthday compatibility|by photo|photo compatibility|tarot|spell|spells|manifest|manifestation|horoscope|gracie|abrams|chase atlantic|somi|noah|kahan|benson|boone|lyrics|sza|twenty|pilots|meme|memes|gif|quotes|status|hindi|urdu|tamil|artinya|adalah|deutsch|traduction|meaning in|sinhala|tagalog|malayalam|bangla|tamil|spanish|french|synonym|synonyms|opposite|antonym|meaning hindi|meaning tamil|bot|prompt engineering|prompts|code|os|electronics|textbook|snapchat|discord|facebook login|instagram login|whatsapp login|character ai|c ai|bible|god|jesus|christian|islam|dua|muslim|kdrama|drama|manhwa|manga|anime|novel|fiction|episode|read online|read free|official trailer|cast|season|steam|ghost of|iphone screen|tv|netflix|vh1|sage|recovery software)\b'
block+=r'|\b(ano ang|kya hai|kalkulator|hari|dalam|hubungan|assamese|amharic|hebrew|arabic|bedeutung|catholic|reba|artifact|mri|ultrasound|hair|haircut|hairstyle|dye|halloween|smoking|cigarette|vape|soccer|hunting|equipment|soft agar|cloning|fading channel|ghost attack|ghost account|ghost hug|ghost soft|gloria|halsey|testing anxiety|test anxiety|hotline|helpline|accommodations|asphalt|aggregate|crash test|helmet|hobbies|crush a test|auto effects|chat effects|analogy|analytical ai|chatbot benefits|chatbot features|relationship heat map|relationship map ai|red flag number|red flag rule|astrotalk|poki|html5|algorithm|love calculator age|love calculator home|crush test name|aquarius|aries|gemini|capricorn|leo|virgo|libra|scorpio|sagittarius|pisces|taurus|cancer|avoidants|narcissism|narcissistic|love bomb hand|green flag hobbies|future forms|zombie apocalypse|zombie dating|chat and cook|potatoes|caseoh|dhananjay|headshot|music|prompt|bracelet|bracelets|gifts|robot|costumes|communication devices|communication board|communications inc|health communication|he will play against|he is playing meaning|emotional bonding hormone|relationship clarity spread|application form|humour meaning)\b'
block+=r'|\b(ariana|grande|beer|beerworks|ghosting house|ghosting hour|ghosting hours|ghosting about|ghosting around|ghost meaning|ghosting test|slowly fading|hola|mlp|heartgold|hayyak|guardian|smart balance|jobs|random text messages|phone send random|when you get random|text analysis examples|text analysis techniques|text analytics techniques|text message data|text message facts|text message reader|text mining|relationship addiction|relationship anxiety|relationship clarity diagnostic|emotional availability scales|relationship expectations scale|relationship communication and|compatibility vs compatibility)\b'
rows=[];rejected=[]
for r in csv.DictReader((out/'expanded-candidates.csv').open(encoding='utf-8-sig')):
    k=r['keyword']
    if re.search(block,k) or k in scope['exact_deny'] or re.search(r'[^a-z0-9\s\x27-]',k):rejected.append(r);continue
    if 'unqueried first-round' in r['source']:r['cluster']='backlog-'+r['cluster']
    r['business_fit']=40 if r['cluster']=='friendship-expansion' else (60 if 'quiz' in k or 'test' in k or 'calculator' in k else 80)
    if r['cluster']=='tools' and re.search(r'analy|decode|stats|statistics',k):r['business_fit']=95
    rows.append(r)
def write(name,rr):
    with (out/name).open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=['keyword','cluster','page','source','business_fit']);w.writeheader();w.writerows(rr)
write('relevant-pool.csv',rows)
selected=[r for r in rows if r['source']=='editorial competitor-adjacent seed']
remaining={c:sorted([r for r in rows if r['cluster']==c and r['source']!='editorial competitor-adjacent seed'],key=lambda r:(len(r['keyword'].split()),r['keyword'])) for c in dict.fromkeys(r['cluster'] for r in rows)}
# Broaden first: limit leftover long-tail variants and unsupported new feature families.
limits={c:(25 if c.startswith('backlog-') else 65 if c=='friendship-expansion' else 160) for c in remaining}
while len(selected)<1000:
    before=len(selected)
    for c,items in remaining.items():
        if items and sum(r['cluster']==c for r in selected)<limits[c] and len(selected)<1000:selected.append(items.pop(0))
    if len(selected)==before:break
assert len(selected)==1000, f'Only {len(selected)} relevant candidates selected: do not query'
old={r['keyword'] for r in csv.DictReader(open('docs/seo-research-2026-09-19/batch-1000.csv',encoding='utf-8-sig'))}
assert len({r['keyword'] for r in selected})==1000 and not old.intersection(r['keyword'] for r in selected)
write('batch-1000.csv',selected)
print('Pool',len(rows),'Selected',len(selected),'Clusters',Counter(r['cluster'] for r in selected))
