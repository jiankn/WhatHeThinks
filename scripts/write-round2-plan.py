"""Compile cached keyword and competitor evidence into an actionable SEO plan."""
import csv,json
from pathlib import Path
OUT=Path('docs/seo-competitor-round2-2026-09-19')
OLD=Path('docs/seo-research-2026-09-19')
kd=json.loads((OUT/'gefei-results.json').read_text(encoding='utf-8'))
metrics={};candidates=[]
for folder in (OLD,OUT):
    raw=json.loads((folder/'dataforseo-response.json').read_text())
    metrics.update({r['keyword']:r for t in raw['tasks'] for r in t['result']})
    candidates+=list(csv.DictReader((folder/'validated-keywords.csv').open(encoding='utf-8-sig')))
assert len(metrics)==len(candidates)==2000
decisions={
'dry texting':('P0','/dry-texting','新内容页','/is-he-losing-interest',90,'定义、自然聊天例子、忙碌与持续冷淡的区别；演示回复长度和主动比例如何一起变化。不要只堆几十条模板回复。'),
'situationship vs relationship':('P0','/situationship-vs-relationship','新对比页','/situationship-analyzer',90,'对比承诺、排他性、计划、沟通边界，附自查清单；与分析器区分“概念比较”和“分析我的聊天”。'),
'love bombing vs genuine interest':('P0','/love-bombing-vs-genuine-interest','新对比页','/mixed-signals-text-analyzer',80,'围绕节奏、边界、持续行动和具体聊天例子，不做人格诊断，也不宣称算法能判定操纵意图。'),
'should i text my ex':('P0','/should-i-text-my-ex','新决策指南','/ex-text-analyzer',90,'按联系目的、对方边界和过往互动分支给建议；与前任是否想复合页面区分意图，不保证复合。'),
'relationship check in questions':('P0','/relationship-check-in-questions','新实用清单','/analyze',80,'按投入、期待、联系节奏和计划提供可直接使用的问题；可做可复制清单，再用报告帮助准备谈话。'),
'how to tell if a guy likes you over text':('P0','/does-he-like-me-text-analyzer','升级现有页','/analyze',95,'升级主词而不是另建重复页；用具体聊天例子先回答，再展示分析器。原 does he like me over text 保留为同页辅助词。'),
'signs he is losing interest':('P0','/is-he-losing-interest','升级现有页','/analyze',95,'480/月词作为主要内容目标；保留原问题和 URL，解释多周变化及反例，不凭单次慢回复下结论。'),
'texting after first date':('P0','/texting-after-first-date','新情境指南','/does-he-like-me-text-analyzer',85,'何时联系、消息例子、对方未回复怎么办；不要使用机械的等几小时规则，也别复制兴趣判断页。'),
'what does this text mean':('P0','/','首页辅助意图','/analyze',90,'880/月但含缩写、图标等歧义；作为首页的真实问题入口，明确需要关系语境；不另做同功能解释器页。'),
'text message analyzer':('P0','/','首页主词','/analyze',95,'量仅110但产品意图强，哥飞盘面有低DR工具站；首页可扩展到此主词，relationship text analyzer 作为精准同义辅助。KD=0不等于没有竞争。'),
'ghosting after first date':('P1','/ghosting-after-first-date','后续情境指南','/mixed-signals-text-analyzer',85,'首轮先作为 texting-after-first-date 的H2；只有能提供独立内容、且GSC显示需求时再拆页。'),
'one sided relationship':('P1','/one-sided-relationship','后续专题','/who-texts-first',85,'有量但真实常规竞争不低；主打投入失衡的例子与自查，工具只量化聊天发起，不能代表关系全部投入。'),
'breadcrumbing examples':('P1','/breadcrumbing-test','扩充现有页','/analyze',90,'先做真实感的示例、反例和落实计划对照；不要先新建同意图示例页。'),
'bare minimum in a relationship':('P1','/bare-minimum-in-a-relationship','后续指南','/situationship-analyzer',80,'区分基本尊重和双方协商的期待；用行为、计划和沟通实例，不以消费金额或回复频率作统一标准。'),
'long distance relationship communication':('P1','/long-distance-relationship-communication','后续指南','/reply-time-calculator',75,'需要补充时区、工作安排等上下文；不能把异地时差直接判成兴趣下降。'),
'talking stage':('P1','/talking-stage','后续主题入口','/does-he-like-me-text-analyzer',80,'5400/月但竞争中等；先用现有喜欢/混合信号页和首约指南积累主题内容，再做总入口。'),
'double texting':('P2','/double-texting','延后','/who-texts-first',80,'一般口径难度高于原输出；可先在聊天礼仪/首约内容解释，不因2900/月就抢着做。'),
'soft ghosting':('P2','/soft-ghosting','延后','/mixed-signals-text-analyzer',80,'量260且竞争中等，先在混合信号内容作为术语解释。'),
'future faking':('P2','/future-faking','延后','/breadcrumbing-test',75,'4400/月但常规难度约64；暂以具体计划兑现和空口承诺的例子支撑breadcrumbing页。'),
'export whatsapp chat':('P2','/export-whatsapp-chat','帮助内容优先于SEO投入','/whatsapp-relationship-analyzer',90,'作为上传帮助很有用，但官方/工具大站强，不能再列为新站优先流量机会。'),
}
def normal_score(r):
    # These manually reviewed phrases are generic, even when the heuristic labels them brand.
    return r['genericScore'] if r.get('keywordType')=='brand' and r.get('genericScore') is not None else r['score']
rows=[]
for k,r in kd.items():
    m=metrics[k];priority,path,kind,cta,fit,note=decisions[k]
    months=sorted(m.get('monthly_searches') or [],key=lambda a:(a['year'],a['month']),reverse=True)
    recent=sum(x['search_volume'] for x in months[:3])/3 if len(months)>=6 else None
    prior=sum(x['search_volume'] for x in months[3:6])/3 if len(months)>=6 else None
    trend=round((recent/prior-1)*100,1) if prior else None
    budget=r.get('linkBudget') or {}
    rows.append(dict(keyword=k,us_monthly_volume=m.get('search_volume'),cpc_usd=m.get('cpc'),gefei_raw_score=r['score'],gefei_type=r.get('keywordType'),gefei_generic_score=r.get('genericScore'),comparison_kd=normal_score(r),priority=priority,business_fit=fit,page=path,page_type=kind,conversion_target=cta,recent_3m_vs_previous_3m_pct=trend,quality_refdomains_raw_model_mid=(budget.get('quality') or {}).get('mid'),type_warning='common phrase misclassified as brand; compare supplied genericScore; backlink budget is raw model only' if r.get('keywordType')=='brand' else '',recommendation=note))
rows.sort(key=lambda r:(r['priority'],r['comparison_kd'],-r['us_monthly_volume']))
def csvout(path,items):
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=list(items[0]));w.writeheader();w.writerows(items)
csvout(OUT/'priority-keywords.csv',rows)
csvout(OUT/'combined-2000-keywords.csv',candidates)
rankings=[]
for name in ['competitor-ranking-keywords.json','rankings-lucen.app.json']:
    d=json.loads((OUT/name).read_text(encoding='utf-8'))
    for r in d['items']:
        rankings.append(dict(domain=d['target'],keyword=r['keyword'],position=r['position'],volume=r['volume'],estimated_organic_traffic=r['etv'],url=r['url'],snapshot_screening_kd=r.get('kd')))
csvout(OUT/'competitor-keywords.csv',rankings)
lines=['# WhatHeThinks：竞品拓词与哥飞SEO二轮筛选','',
'研究日期：2026-09-19；美国英语。结论：保留商业工具词做转化，但增长内容不能局限在10–30次/月的自造功能名称。采用“工具页承接分析需求＋问题/对比内容获取搜索访问”的双层结构。',
'','## 本轮范围与费用','',
'- 203个人工种子，结合Google autocomplete和上轮未查候选，获得4084个与上批不重复的候选；程序与人工筛选后选出1000个新词。种子建议不代表已验证搜索量。',
'- DataForSEO：新增1000词，一次Google Ads Live任务，实际$0.09；旧1000词全部复用，本项目两轮合计2000个唯一词、总$0.18。没有逐词补查。',
f'- 新批677词返回量（676个正值、1个为0），323词未返回量；两批合计{sum(r.get("search_volume") is not None for r in metrics.values())}词有量。不要将近似变体的量相加。',
f'- 哥飞KD：成功精评{len(kd)}词；保存原始分、常规分、竞争页面、原因与链接预算。未force重算。',
'- 哥飞站点出词：成功查What Brandon Thinks和Lucen，分别返回2词和50词样本（Lucen库内总计262词）。每次返回charged=5，共10积分；返回cost=0是接口字段，不代表没有积分扣除。',
'- 站点出词未接受该KD令牌为登录态，触发游客quota后停止；ChatVisor请求未得到排名词，DecodeThisText未查询。KD令牌查询正常。没有绕过额度或改用其他付费域名服务。',
'- 本轮不修改网站代码，也不新增内容页面。项目尚未上线，不需要旧URL重定向。',
'','## 竞品到底在做什么','',
'### What Brandon Thinks','',
'[首页](https://www.whatbrandonthinks.com/)主打WhatsApp聊天报告；[relationship](https://www.whatbrandonthinks.com/relationship)覆盖暧昧、前任、异地与伴侣；[friends](https://www.whatbrandonthinks.com/friends)是朋友/群聊分析和roast。其sitemap有6类页面（首页、relationship、friends、family、imessage、faq）×3种语言，共18个URL。',
'',
'哥飞美国排名快照只记录brandon ai（110/月、排名1）和brandon say（50/月、排名8，语义也未必纯品牌）。不能据此断言站点没有其他流量；但它不是目前可证明拥有大量非品牌SEO排名的样本。网站的报告数量、证言、截图与分享设计不等于搜索流量。',
'',
'可借鉴：按关系场景组织产品、样例报告与分享体验。不可直接照抄：群聊、多会话人格画像、朋友roast；我们的当前双人恋爱分析无法完整承接。',
'','### Lucen：更具体的SEO对照','',
'[Lucen](https://lucen.app/)公开导航同时包含功能、平台和博客。哥飞美国快照列出262个排名词，本轮只取按ETV排序的50词样本；这些是供应商快照，不是其GSC。',
'','| 词 | 美国月量（快照） | 快照排名 | 承接方式 |','|---|---:|---:|---|',
'| text message analyzer | 110 | 2 | 首页 |',
'| text message analysis | 320 | 3 | 首页 |',
'| situationship vs relationship | 1000 | 16 | 比较文章 |',
'| situationship vs friends with benefits | 1600 | 13 | 比较文章 |',
'| types of situationships | 260 | 8 | situationship主题文章 |',
'| situationship | 74000 | 45 | 主题文章；量大但尚未排前列 |',
'',
'这说明小工具词确实是商业入口，较大的关系问题词需要文章承接；不能把“74,000/月”当作一个小站已拿到的流量。',
'','## 精评后的词表','',
'搜索量统一用DataForSEO美国英语，避免混用哥飞从域名主力词推断的量。KD为哥飞本次模型结果；部分普通词被其平台密度规则误识别为品牌词，我们人工判定为普通词，表中比较使用API同时返回的genericScore，原始score保留在CSV。两者都只是筛选参考。',
'','| 优先级 | 关键词 | 月量 | 常规比较KD | 处理方式 |','|---|---|---:|---:|---|']
for r in rows:lines.append(f"| {r['priority']} | {r['keyword']} | {r['us_monthly_volume']} | {r['comparison_kd']} | {r['page_type']} `{r['page']}` |")
lines+=['','## 第一批具体怎么做','',
'先升级现有首页、喜欢分析页、兴趣下降页，再发布6篇内容：dry texting、situationship vs relationship、love bombing vs genuine interest、should i text my ex、relationship check in questions、texting after first date。不要一次上线几十篇同模板文章。',
'',
'这轮修正上一版：首页建议以text message analyzer为主词、relationship text analyzer作为辅助；喜欢页主打how to tell if a guy likes you over text；兴趣下降页主打signs he is losing interest。其余已有商业页保留，用文章给它们送合适的用户，不为了数字大而把全部商业页变成百科。',
'']
for r in rows:
    if r['priority']!='P0':continue
    lines += [f"### {r['keyword']}",'',f"- 页面：`{r['page']}`；转化入口：`{r['conversion_target']}`。",f"- 内容要求：{r['recommendation']}"]
lines+=['','## 哪些大词先不打','',
'| 词 | 美国月量 | 原因 |','|---|---:|---|',
'| love calculator | 74000 | 姓名匹配/娱乐测试意图，和真实聊天分析不一致 |',
'| love bombing | 110000 | 头部解释与敏感关系判断需求，先做更聚焦的比较词；头词未精评KD |',
'| ghosting | 49500 | 泛意图和歧义大，先做首约失联场景；头词未精评KD |',
'| best friend quiz | 5400 | 要问卷/朋友玩法，当前没有该产品 |',
'| relationship quiz | 2900 | 问卷与聊天导入不是同一种预期 |',
'| one sided friendship | 1900 | 值得后续扩产品时重新评估，当前不是男方恋爱报告定位 |',
'| future faking | 4400 | 常规KD63.9，先做breadcrumbing例子，不当第一批大词 |',
'| talking stage | 5400 | KD52.2，等主题内容和内链完善后做总入口 |',
'',
'flirty texts（4400/月）、AI relationship advice（480/月）可留作后续内容/功能方向；需要分别满足回复示例或持续建议的意图，不能只挂上传按钮。',
'','## 为什么这些词值得，而不只看分数','',
'1. 有需求：主攻内容优先月量约400以上；例外是高商业匹配的text message analyzer。',
'2. 能承接：文章先回答问题，再展示用户能用聊天记录检查什么；不是在热门词下面硬塞无关工具。',
'3. 有竞争空间：dry texting、situationship比较、兴趣判断的返回盘面包含低DR内容站和工具站，但不能把论坛排名直接等同“内容真空”。',
'4. 有独立页面价值：对比页用比较表与情境，决策页用分支与边界，问题清单可复制。主词相近但意图相同的查询留在一页。',
'',
'## 人工复核与数据限制','',
'- 哥飞把double texting、how to tell if a guy likes you over text、signs he is losing interest、one sided relationship等普通短语判为brand。我们不照抄“品牌截流”打法，改看返回的常规口径并保留告警。',
'- text message analyzer的0分是算法减分后触底；不是零外链、零成本、必上首页。其返回盘面确有多个低DR工具站，才是可参考的信息。',
'- 多个关键词返回keywordVolume=null；situationship vs relationship返回240，与DataForSEO 1000不同。报告统一使用同批US/en Google Ads指标，不挑大的拼接。',
'- 部分KD只有7–9个有效结果，快照与实时结果也可能不同；未获得完整SERP/站点GSC，不保证难度稳定或能进入前十。',
'- 哥飞linkBudget的quality是引用域数量估算，不是美元预算，也不是购买外链要求；brand误判词的预算建立在原分数上，仅保留原值不当执行目标。',
'- 词池中的page/business_fit是粗筛分类。新批中产品扩展、泛词和歧义词是对照研究对象；它们有量不等于应上页面。最终建议只见priority-keywords.csv。',
'- 最近3个月与前3个月的变化已写入CSV，但低量和季节波动容易放大百分比，不单凭短期增幅决策。',
'',
'## 防止关键词互抢','',
'首页独占工具总意图与what does this text mean入口，不另造重复工具页。喜欢/兴趣下降保留现有URL。situationship-vs-relationship回答概念区别，situationship-analyzer负责分析个人聊天。首约后发消息先覆盖失联子问题，后续有独立内容与曝光证据再拆ghosting-after-first-date。breadcrumbing示例直接补现有页。',
'',
'## 来源与交付','',
'- [哥飞KD方法与API字段](https://seo.web.cafe/kd/docs)：原分、常规分、链接预算与缓存口径。',
'- [哥飞站点出词](https://seo.web.cafe/sitekw/)：排名快照与ETV为估算，非实测访问量。',
'- [DataForSEO批量接口](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)：最多1000词/任务，近似变体可能合并。',
'- priority-keywords.csv：20个精评词、原始/常规KD、趋势、优先级、页面、转化入口。',
'- combined-2000-keywords.csv：两批2000个唯一候选及实测返回值，空值不改0。',
'- competitor-keywords.csv：2个站点、52条排名快照记录。',
'- gefei-results.json：完整20词哥飞输出；dataforseo-response.json：第二批原始数据和$0.09费用。',
'- expanded-candidates.csv：4084个新候选；batch-1000.csv：此次实际查询；未查候选留待后续攒满再查。',
'',
'这是上线前选词方案。内容上线后再用GSC验证曝光、点击、主查询和页面互抢；现在不能报告SEO增长或把供应商估算当真实访客。']
(OUT/'competitor-keyword-plan.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Saved',len(rows),'KD decisions,',len(candidates),'unique keyword metrics,',len(rankings),'ranking records')
