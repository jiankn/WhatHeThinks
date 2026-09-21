"""Validate search-visible local responses, metadata, schema and internal links."""
import json,re,sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:3000'
assert urlsplit(base).hostname in ('localhost','127.0.0.1')
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.h1=0;self.title='';self.description='';self.canonical='';self.robots='';self.links=[];self.ids=set();self.text=[];self.tag='';self.schema=[];self.jsonld=False;self.buffer='';self.skip=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);self.tag=tag
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.add(a['id'])
        if tag=='meta' and a.get('name')=='description':self.description=a.get('content','')
        if tag=='meta' and a.get('name')=='robots':self.robots=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical':self.canonical=a['href']
        if tag=='a':self.links.append(a.get('href',''))
        if tag in ('script','style'):self.skip+=1
        if tag=='script' and a.get('type')=='application/ld+json':self.jsonld=True;self.buffer=''
    def handle_endtag(self,tag):
        if tag=='script' and self.jsonld:self.schema.append(json.loads(self.buffer));self.jsonld=False
        if tag in ('script','style'):self.skip-=1
        self.tag=''
    def handle_data(self,data):
        if self.jsonld:self.buffer+=data
        if self.tag=='title':self.title+=data
        if not self.skip:self.text.append(data)

sitemap=ET.fromstring(urlopen(base+'/sitemap.xml').read())
urls=[e.text for e in sitemap.findall('{*}url/{*}loc')]
assert len(urls)==len(set(urls))==32, f'Expected 30 acquisition pages + guides + FAQ, got {len(urls)}'
pages={};titles=set();descriptions=set();results=[]
for url in urls:
    path=urlsplit(url).path or '/';response=urlopen(base+path)
    assert response.status==200,path
    p=Page();p.feed(response.read().decode());pages[path]=p
    assert p.h1==1,(path,'H1',p.h1)
    assert p.title and p.title not in titles,(path,'duplicate/missing title');titles.add(p.title)
    assert p.description and p.description not in descriptions,(path,'duplicate/missing description');descriptions.add(p.description)
    assert p.canonical.rstrip('/')==url.rstrip('/'),(path,p.canonical,url)
    assert 'noindex' not in p.robots,(path,'noindex')
    if path not in ('/guides','/faq'):assert p.schema,(path,'missing schema')
    for href in p.links:
        if href.startswith('#'):assert href[1:] in p.ids,(path,'missing anchor',href)
    results.append({'path':path,'status':response.status,'h1':p.h1,'title':p.title,'words':len(' '.join(p.text).split()),'schemas':len(p.schema)})
links={urlsplit(h).path for p in pages.values() for h in p.links if h.startswith('/') and not h.startswith('//')}
for link in sorted(links-set(pages)):
    assert urlopen(base+link).status==200,link
for path in pages:
    if path!='/':assert any(urlsplit(h).path==path for other,p in pages.items() if other!=path for h in p.links),(path,'orphan')
for path in ('/analyze','/sample-report'):
    p=Page();p.feed(urlopen(base+path).read().decode());assert 'noindex' in p.robots,(path,'must be noindex')
for path in ('/tools/who-texts-first','/tools/reply-time-calculator','/not-a-real-guide'):
    try:urlopen(base+path);raise AssertionError((path,'should be 404'))
    except HTTPError as e:assert e.code==404,(path,e.code)
out=Path('reports/seo-launch-2026-09-22');out.mkdir(parents=True,exist_ok=True)
(out/'html-audit.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(f'PASS: {len(pages)} sitemap pages; {len(links)} internal destinations; unique metadata, canonical, H1, JSON-LD, anchor and noindex checks.')
