"""Build an evidence-linked shortlist from cached results only."""
import csv,json
from pathlib import Path
OUT=Path('docs/seo-round3-2026-09-21')
rows=list(csv.DictReader((OUT/'validated-keywords.csv').open(encoding='utf-8-sig')))
old=list(csv.DictReader(open('docs/seo-competitor-round2-2026-09-19/combined-2000-keywords.csv',encoding='utf-8-sig')))
assert len(rows)==1000 and len({r['keyword'] for r in old+rows})==3000
metrics={r['keyword']:r for r in rows}
kd=json.loads((OUT/'gefei-results.json').read_text(encoding='utf-8'))
plans={
'questions to ask your boyfriend':(80,'/questions-to-ask-your-boyfriend','新清单页','按关系阶段、聊天目的分类，提供追问与自然对话示例；分析入口辅助准备沟通。搜索者主要要问题清单，付费分析转化尚未验证。'),
'questions to ask your crush':(85,'/questions-to-ask-your-crush','新清单页','先满足可使用的问题需求，提供顺着回答继续聊的例子；不要简单复制boyfriend清单。'),
'how to know if someone likes you':(90,'/does-he-like-me-text-analyzer','优先升级现有页','通用someone词含线下肢体线索、男女双方等需求；现有产品聚焦You/Him，页面需真实回答宽意图再引导聊天分析，避免再建同意图重复页。'),
'conversation starters for couples':(80,'/conversation-starters-for-couples','候选清单页','围绕伴侣重新建立交流、日常沟通；与boyfriend问题清单先比对SERP与内容重叠再决定是否拆页。'),
'how to keep a conversation going':(80,'/how-to-keep-a-conversation-going','新方法页','自然追问、分享、话题转接，提供完整对话前后对比；覆盖线下与文字语境，不能全部改成上传工具。'),
'texting styles':(95,'/texting-styles','新说明页','结合短回复、长消息、发起频率、节奏的实例；不把聊天风格当作固定人格或心理诊断。'),
'left on read':(95,'/left-on-read','新问题页','解释已读未回、时间和情境差异、如何决定下一步；排除书影音、游戏同名意图，不能推断已读未回等于不喜欢。'),
'flirty questions to ask a guy':(85,'/flirty-questions-to-ask-a-guy','候选清单页','提供轻松不冒犯的问题、适用关系阶段与后续对话；与crush清单先判断重叠。'),
'flirting examples':(90,'/flirting-examples','新示例页','用友好vs暧昧的成对例子、上下文解释和反例，贴近聊天分析；避免笼统保证识别意图。'),
'dating intentions':(85,'/dating-intentions','新解释页','明确随意约会、认真关系等期待，提供如何问清楚的消息例子。'),
'reassurance in a relationship':(75,'/reassurance-in-a-relationship','后续内容页','提供如何表达与提出需求的对话例子；分析器不能替代直接沟通。'),
'what to text your crush':(90,'/what-to-text-your-crush','新行动指南','按首次开聊、继续对话、邀约、无回复等情境给消息模板，避免操控和保证回复。'),
'conversation starters over text':(90,'/conversation-starters-over-text','新清单页','从陌生到熟悉分场景，提供后续接话；若与what-to-text-your-crush高度重复则合并。'),
'what he thinks':(80,'/','品牌兼需求表达','本轮US/en SERP以感情解读为主，含少量语法页，修正此前带引号搜索偏翻译的判断。值得首页经营，但不应替代产品用途说明。月均720，2026年8月2900，增长原因未核实，不能外推。'),
'what is he thinking':(70,'/','辅助表达观察','SERP混有感情讨论和同名歌曲歌词；不能把用户想知道想法转化成读心承诺。'),
'what does he think of me':(70,'/','辅助表达观察','实际SERP有测试、塔罗和感情讨论混合意图；适合作为用户诉求表达，不能直接认定为分析工具需求。'),
}
def write(name,items):
    with (OUT/name).open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=list(items[0]));w.writeheader();w.writerows(items)
write('combined-3000-keywords.csv',old+rows)
short=[]
for k,v in kd.items():
    fit,path,kind,note=plans[k];m=metrics[k]
    score=v.get('genericScore') if v.get('keywordType')=='brand' and v.get('genericScore') is not None else v['score']
    priority='优先候选' if fit>=80 and score<=35 else '第二梯队' if fit>=80 and score<=50 else '后续观察'
    if fit<80:priority='辅助/观察'
    if k=='what he thinks':priority='辅助/观察'
    short.append(dict(keyword=k,us_monthly_volume=m['search_volume_us'],cpc_usd=m['cpc_usd'],raw_kd=v['score'],provider_keyword_type=v.get('keywordType'),generic_kd=v.get('genericScore'),comparison_kd=score,serp_results=len(v.get('details',[])),business_fit=fit,priority=priority,page=path,page_type=kind,provider_volume=v.get('keywordVolume'),recommendation=note))
short.sort(key=lambda r:({'优先候选':0,'第二梯队':1,'后续观察':2,'辅助/观察':3}[r['priority']],-int(r['us_monthly_volume'] or 0)))
write('shortlist.csv',short)
screen=[]
for r in sorted(rows,key=lambda r:-int(r['search_volume_us'] or 0)):
    vol=int(r['search_volume_us'] or 0)
    status='无量数据，不能当作零' if not r['search_volume_us'] else '有量候选，KD未查' if vol>=1000 else '长尾/辅助候选，KD未查'
    if r['keyword'] in kd:status='已进行哥飞SERP精评，见shortlist.csv'
    screen.append({**r,'screening_status':status})
write('screened-1000.csv',screen)
raw=json.loads((OUT/'dataforseo-response.json').read_text())
lines=['# WhatHeThinks 第三轮关键词研究','',
'日期：2026-09-21。美国 / 英语，DataForSEO Google Ads 月均搜索量。目标：扩大可获客需求，同时保留产品关联。',
'','## 数据与费用','',
'- 167个人工种子、668个Google自动补全查询，结合未查询候选，过滤得到4804个候选。排除前两轮2000词后选取1000个唯一新词；三轮合计3000个唯一查询字符串。',
f'- DataForSEO实际1次批量请求，1000条结果，费用${raw["cost"]:.2f}；三轮累计$0.27。640词返回正搜索量，360词无数据（不等于0）；76个查询字符串月量至少1000，含近似变体，不能当作76个独立页面或相加计算市场规模。',
f'- 哥飞SEO本轮成功返回{len(kd)}个报告；没有force重算。API未提供金额，因此本轮总费用不能写成只有$0.09；$0.09仅是DataForSEO费用。',
'- 哥飞搜索量和DataForSEO口径可能不同，比较统一用DataForSEO，不挑较大的数。保留provider_volume供检查。',
'- paid_competition是广告竞争，不是SEO难度。哥飞有时把普通短语标记为brand；对本轮这些普通短语同时保留raw_kd与generic_kd，比较采用其返回的generic_kd。不是自行计算一个新KD。',
'- business_fit为人工编辑判断，不是API指标。优先级按产品匹配和竞争作初筛，不是排名保证。含线下、同性、泛关系、工具扩展的候选不代表现有产品支持所有情境。',
'','## 精评结果','',
'|关键词|美国月量|原始KD|常规KD（仅品牌误判时）|建议|页面|',
'|---|---:|---:|---:|---|---|']
for r in short:lines.append(f'|{r["keyword"]}|{r["us_monthly_volume"]}|{r["raw_kd"]}|{r["generic_kd"] if r["generic_kd"] is not None else "—"}|{r["priority"]}|`{r["page"]}`|')
lines+=['','## 每页建设与搜索意图','']
for r in short:
    v=kd[r['keyword']]
    lines+=['### '+r['keyword'],'',r['recommendation'],'',f'哥飞返回{len(v.get("details",[]))}条搜索结果。样本：']
    for d in v.get('details',[])[:3]:lines.append(f'- [{d.get("title") or d["domain"]}]({d["url"]})：第{d["position"]}位，{d["domain"]}。')
    lines.append('')
lines+=['## 内容与产品安排','',
'优先建设顺序建议：texting styles（产品最贴近）→ questions to ask your boyfriend（大需求清单）→升级已有喜欢判断页以覆盖how to know if someone likes you → conversation starters for couples（先确认与boyfriend清单内容边界）。原有dry texting继续保留，不能因本轮新词取代所有旧规划。',
'',
'questions to ask your boyfriend的74,000是12个月估算均量，2026年7、8月均为49,500，近期下降；texting styles最新月为3,600，与均量接近。所有趋势保留原始monthly_searches。',
'',
'质量边界：部分SERP只返回8–9条；论坛排名不等于存在容易替代的空位。报告中的竞品全站流量不能当作该关键词或该页面流量，也不能采信API原文中据此推导“打法已验证”的结论。',
'',
'1. 原有聊天分析首页保留；不要为每个近似关键词生成一页。优先升级喜欢/混合信号等已有页面。',
'2. 新增需求方向是“如何交流”：问题清单、接话实例、对话风格。这与既有“关系是什么/他是否喜欢我”互补。',
'3. 清单类页面必须先交付可使用的问题和追问，分析CTA放在用户需要回顾自己互动模式的位置，不能把74,000搜索量当作74,000工具用户。',
'4. 本轮未深查的高量词如unrequited love、conversation starters、first date questions仅是候选，不能与已精评词混为一谈。',
'5. 上线后以GSC非品牌点击、页面到分析启动率和付费转化验证；不能按关键词量相加承诺流量。',
'','## 可复核文件','',
'- batch-1000.csv：准确查询集合；validated-keywords.csv：API量；dataforseo-response.json：完整原始月度数据。',
'- gefei-results.json：难度、SERP、原因、链接预算原始结果。链接预算是模型估算的引用域数量，不是美元或购买外链建议。',
'- shortlist.csv：精评与拟定页面；screened-1000.csv：全量初筛；combined-3000-keywords.csv：三轮不重叠合并。',
'- scripts/research-round3.py与scripts/write-round3-report.py：可复现筛选与报告。']
(OUT/'keyword-opportunities.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Report written',len(short),'KD reports;',len(old+rows),'unique keywords')
