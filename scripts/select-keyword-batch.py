"""Editorial relevance filtering, then balanced selection; no network or billing."""
import csv,re
from pathlib import Path
from collections import Counter
out=Path('docs/seo-research-2026-09-19')
rows=list(csv.DictReader((out/'candidate-pool.csv').open(encoding='utf-8-sig')))
deny=r'\b(tarot|astrology|horoscope|hsc|worksheet|cognigy|vonage|hutchby|sacks|wooffitt|wiki|wikipedia|research|paper|chess|pickett|chart|forex|trading|header|rcs|sms|html|hmu|hm|hbd|hy|hru|wyd|wyf|wsp|wfh|wsg|wtv|wyll|initialism|symbols|icons|hindi|urdu|tamil|telugu|adalah|artinya|traduction|samsung|moodie|henry|meme|memes|gif|quotes|quote|borison|bk|graphic|novel|author|album|meaningful|cast|wattpad|ao3|ao 3|allthetests|buzzfeed|middle school|high school|teenager|school|hallway|cat|brown women|at work|work crush|without talking|family guy|css|tailwind|vodafone|telstra|airtel|axis|autosweep|att|sbi|hdfc|611|tnt|o2|easytrip|bootstrap|wrap|bank|taxi|computer|acronym|abbreviation|syllable|wordle|crossword|wordhippo|meaning in|monosyllabic|monosyllables|one word answer|one word question|one word answers|one word responses called|one word replies are called|calendar|monitor|os|ircc|uscis|visa|ambulance|police|api|hdd|ssd|disk|job|interview|offerup|house offer|wales|art|grok|shout|vinted|steam|react|starbucks|nsfas|nwu|walmart|audio|funk|heating|cooling|hvac|wireless|airbnb|android|quick replies|janitor|alexa|employers|traduction|synonym|synonyms|essay|punjabi|kannada|marathi|bengali|tamil|bangla|malayalam|nepali|telugu|chinese|korean|japanese|french|spanish|german|italian|francais|english translation|poem|poetry|games|game|audiobook|summary|page count|chapters|chapter|movie|tv|television|cast|netflix|amazon|wikipedia|synopsis|spice|spicy|spoilers|spoiler|ending explained|author|novella|epub|kindle|goodreads|barnes|noble|waterstones|tour|concert|chords|tabs|guitar|singer|sings|rapper|instrumental|karaoke|release date|vinyl|remix|feat|ft|mp3|songtext|robin thicke|ruth b|ruth b\.|avril|sabrina|shawn|dua lipa|selena|bieber|taylor|sza|lauv|zayn|keshi|niall|charlie|jungkook|fletcher|olivia|harry styles|roblox|gacha|wizz|hack|hacker|recover|recovery|transfer|backup|import|not showing|count wrong|court|written notice|in writing|support|account balance|text effects|ai written|human text|ai or human|customer service|business|code|coding|java|dataset|notebook|streamlit|kaggle|dissertation|thesis|sentiment classification|breast|cancer|stroke|medical)\b'
home_allow=r'(relationship.*(analy|ai)|dating.*(analy|ai)|analy.*(text messages|texts|conversation|chat)|text message (analy|meaning ai)|conversation analyzer|chat analy|what do(es)? his text|decode his texts|decoding guys texts)'
extra_deny=r'\b(anime|manga|manhwa|webtoon|comic|artist|ash|bl|abby|jimenez|wilson|heath|teagan|deutsch|idrlabs|purity|rice|judgement|humor|asl|hansel|gretel|angular|wcag|accessibility|woolworths|oil|egg|breadcrumbs|breadcrumb hq|breadcrumb test|breadcrumb testing|breadcrumb example|breadcrumb examples|batula|original dating|snowflake|hoovering|testing the door|apparel|hoodie|horse|walkthrough|hardware|sensors|raiders|quest|kicad|incentives|wilmington|win or lose|excheck|army|sakura|jonah|hill|hussey|hanged man|hex|harassing|hyuluka|hookify|activity relationship|relationship management|discourse|policy analysis|processing|turnaround|hard drive|web application|submitting application|response time website|response time human|response time aa|late replies|fast answer|fast reply ai|fast reply app|fast response word|fast reply another|fast reply would|fast replies get|text message timer|time stamp|time sensitive|secret chat|funny|pustur|netlify|https|poster|project|viewed my|listen to my|chat tips|how does whatsapp|does whatsapp use|are dating apps|group chats|texting apps|instagram dm features|instagram dm tester|instagram dm tricks|chat features|chat list|group analyzer|analytics for instagram|check dm|does instagram ruin|double happiness|double heart|text balance|text and balance|word count limit|count as evidence|count as texts|who starts conversation like|one way texting app|he is sick|dry text happy birthday|dry text other words|wet texting|i stopped making plans|why is it going to be cold)\b'
extra_deny+=r'|\b(acrylic|stand|ch 1|billionaire|mercury|retrograde|980|blunt|one sided situationship trade|painful one sided situationship trade|them one sided|what is the healthy|what is the helping|relationship house|old text messages disappear|why am i getting random texts|breadcrumbing work|breadcrumb method|who sent the first|what country|drives more|dead plants|text they disagree|why do strangers|why do people start conversations with so)\b'
exact_deny={'more text','healthy relationship','relationship analysis example','relationship analysis meaning','ex checking account','what is the elapsed time calculator','he is interested in me but has a girlfriend'}
rows=[r for r in rows if r['keyword'] not in exact_deny and not re.search(extra_deny,r['keyword']) and not re.search(deny,r['keyword']) and not re.search(r'[&./]|\b(she|her|women|woman|girl|girlfriend|wife|wlw|lgbt|lesbian)\b',r['keyword']) and (r['cluster']!='home' or re.search(home_allow,r['keyword']))]
extra={
'home':['relationship text analyzer online','relationship text analyzer free','ai relationship text analysis','dating text analyzer free','text analyzer for relationships'],
'interest':['does he like me text analyzer','does he like me text analysis','does he like me text analyzer free'],
'mixed':['mixed signals analyzer','mixed signals text analysis','mixed signals in dating','mixed signals in a relationship'],
'whatsapp':['whatsapp chat analyzer online','whatsapp chat analyzer free','whatsapp relationship analyzer free'],
'ex':['analyze ex texts','ex text analysis'],
'initiation':['conversation initiation calculator','who starts conversations more','who texts first analyzer'],
'reply':['text reply time calculator','whatsapp response time calculator','whatsapp reply time calculator']}
for cluster,words in extra.items():
    template=next(r for r in rows if r['cluster']==cluster)
    for k in words:
        if not any(r['keyword']==k for r in rows):rows.append({**template,'keyword':k,'source':'editorial seed'})
for r in rows:
    k=r['keyword']
    r['business_fit']=95 if re.search(r'analy[sz]|calculator|chat stat',k) else 65
    if 'quiz' in k or 'test' in k:r['business_fit']=45
    if r['cluster']=='platform':r['business_fit']=65
    if k in ['situationship','mixed signals','breadcrumbing','response time calculator','average response time','relationship analysis','conversation analyzer','define the relationship']:r['business_fit']=30
print('Relevant pool',len(rows),Counter(r['cluster'] for r in rows))
with (out/'reviewed-pool.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
# Keep every seed then round-robin by intent, shortest specific suggestions first.
selected=[r for r in rows if r['source']=='editorial seed']
remaining={c:sorted([r for r in rows if r['cluster']==c and r['source']!='editorial seed'],key=lambda r:(len(r['keyword'].split()),r['keyword'])) for c in dict.fromkeys(r['cluster'] for r in rows)}
while len(selected)<min(1000,len(rows)):
    for items in remaining.values():
        if items and len(selected)<1000:selected.append(items.pop(0))
if len(selected)<1000:raise SystemExit('Not enough relevant words: do not bill')
with (out/'batch-1000.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(selected)
print('Selected',len(selected),Counter(r['cluster'] for r in selected))
