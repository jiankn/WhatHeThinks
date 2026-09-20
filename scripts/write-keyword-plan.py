"""Join editorial page decisions to the saved API response; no network calls."""
import csv,json
from pathlib import Path
out=Path('docs/seo-research-2026-09-19')
data=json.loads((out/'dataforseo-response.json').read_text())
metrics={r['keyword']:r for t in data['tasks'] for r in t['result']}
# One acquisition intent per existing page. Missing exact volumes remain missing.
plan=[
('/', 'relationship text analyzer','P0','工具','relationship chat analyzer|text message analyzer|analyze text messages','Relationship Text Analyzer — Understand His Texting Pattern','Analyze your WhatsApp chat or paste messages to explore effort, reply patterns and mixed signals. Start with a free preview; the full report is $9.99.','保留首页聚焦关系聊天分析；广义 text message analyzer 放辅助段落，不另建同义工具页。',95),
('/is-he-losing-interest','is he losing interest','P0','问题＋分析','signs he is losing interest|is he losing interest or just busy|signs he is pulling away','Is He Losing Interest? Signs in His Texting Pattern','See whether his texting effort has changed. Review who starts conversations, reply patterns and follow-through, with a free chat analysis preview.','保留主意图；用 signs he is losing interest 做核心 H2（480/月），解释忙碌与持续变化的区别。',95),
('/does-he-like-me-text-analyzer','does he like me over text','P0','问题＋分析','how to tell if a guy likes you over text|signs he likes you over text|is he flirting or being friendly','Does He Like Me Over Text? Check the Conversation','Explore signs of interest in his texts, including questions, effort and concrete plans. Paste messages or upload a WhatsApp chat for a free preview.','补实质回答与聊天例子；当前 simple 布局省略答案模块，不宜仅靠上传框争信息型词。480/月长尾做 H2，同页覆盖。',95),
('/mixed-signals-text-analyzer','mixed signals from a guy','P0','问题＋分析','mixed signals in a relationship|inconsistent texting|hot and cold texting','Mixed Signals From a Guy? Check His Texting Pattern','Make sense of mixed signals from a guy. Compare warm messages with consistency, effort and follow-through, then explore your own chat patterns.','替代暂无量的 mixed signals text analyzer 主词；恢复解释、实例和应对建议，分析器作为验证入口。',90),
('/situationship-analyzer','am i in a situationship','P1','问题＋分析','situationship analyzer|signs of a situationship|situationship vs relationship','Am I in a Situationship? Signs to Check in Your Chat','Explore signs of a situationship, from unclear plans to uneven effort. Use your messages to examine patterns without guessing what someone feels.','210/月问题主词，analyzer 10/月为工具辅助词；添加关系边界与沟通建议，不包装成临床或计分问卷。',85),
('/breadcrumbing-test','breadcrumbing test','P1','自查工具','is he breadcrumbing me|breadcrumbing texts|breadcrumbing examples','Breadcrumbing Test — Check the Pattern in His Texts','Check for repeated disappear-and-return patterns, vague plans and uneven effort. This chat-based breadcrumbing check uses messages, not a diagnosis.','主词10/月但强匹配；标题明确 chat-based。examples 720/月、texts 140/月、is he breadcrumbing me 50/月先在同页回答，不另建抢词页。',90),
('/ex-text-analyzer','does my ex want me back','P1','问题＋分析','signs your ex wants you back|ex texts after no contact|ex breadcrumbing','Does My Ex Want Me Back? Look Beyond the Text','Review your ex’s messages for consistent effort and concrete plans. Compare renewed contact with old patterns before deciding what to do next.','ex text analyzer 未返回搜索量，降为功能描述；先解释信号和局限，不能承诺知道前任内心或复合成功率。',85),
('/whatsapp-relationship-analyzer','whatsapp chat analyzer','P0','平台工具','whatsapp chat statistics|whatsapp chat analysis|whatsapp conversation analyzer','WhatsApp Chat Analyzer — Stats & Relationship Patterns','Upload a WhatsApp export to explore who reaches out, reply times and changes in effort. See a free preview before unlocking the full relationship report.','平台页独占 WhatsApp 词；先展示统计预览与样例，清楚区分免费预览与付费完整报告。保留现有 URL。',95),
('/who-texts-first','who texts first','P1','工具＋解释','who texts first calculator|he never texts first|one sided texting','Who Texts First? Free WhatsApp Conversation Calculator','Find out who starts more conversations in your WhatsApp chat. This free calculator runs in your browser and explains how conversation starts are counted.','30/月主词有建议型混合意图，首屏立即提供计算器并解释含义；不主打 who texts more，后者是消息数量。',85),
('/reply-time-calculator','reply time calculator','P2','工具','text reply time calculator|whatsapp reply time calculator|average text response time','Reply Time Calculator — Check Your WhatsApp Chat','Calculate typical reply times in your WhatsApp chat. Compare both sides with a free browser-based tool that excludes overnight gaps from the calculation.','主词暂无量但准确，作为工具和内链资产保留；不换成带操作系统/客服意图的 response time calculator（40/月）。',95),
]
fields=['page','primary_keyword','us_monthly_volume','cpc_usd','intent','priority','business_fit','seo_kd','structural_kd','secondary_keywords','proposed_title','proposed_description','implementation_note']
records=[]
for page,k,p,intent,secondary,title,desc,note,fit in plan:
    m=metrics.get(k,{})
    records.append(dict(zip(fields,[page,k,m.get('search_volume'),m.get('cpc'),intent,p,fit,'未查询','未查询',secondary,title,desc,note])))
with (out/'page-keyword-map.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(records)
lines=['# WhatHeThinks：一页一主意图的关键词方案','',
'日期：2026-09-19。美国英语市场；搜索量为 DataForSEO / Google Ads 返回的月均估算。本轮 1000 词、1 次付费请求，实际费用 **$0.09**。590 词有搜索量（589 正数、1 个为 0），410 词未返回量。历史月份为 2025-09 至 2026-08。',
'','## 结论','',
'首页继续主打 relationship text analyzer；场景页用用户实际提问组织内容；平台页与统计工具各自承担独立任务。不要把每个页面都改成“AI text analyzer”，也不要只看最大搜索量。10 个获客页对应 10 个主词；另外的品牌帮助、法律、账号和报告页各有用途，不强行塞获客词。',
'','## 现有获客页面主词','',
'— 表示接口未返回量，不表示 0。所有 SEO KD 与结构难度均未查，本报告不声称这些词“容易排名”。',
'','| 页面 | 主关键词 | 美国月均 | 优先级 |','|---|---|---:|---|']
for r in records:
    lines.append(f"| `{r['page']}` | {r['primary_keyword']} | {r['us_monthly_volume'] if r['us_monthly_volume'] is not None else '—'} | {r['priority']} |")
lines+=['','## 页面改造要求与可直接使用的标题描述','',
'下面的文案和内容调整为待实施方案；工具页已改为根目录地址。项目尚未上线，不保留旧 /tools/ 路由或重定向。其余现有 URL 保留。P0/P1 是综合产品匹配与改造价值的人工优先级，不是 API 难度或流量预测。']
for r in records:
    lines += ['',f"### {r['page']}",'',f"- 主词：{r['primary_keyword']}；意图：{r['intent']}。",f"- 同页辅助词：{r['secondary_keywords'].replace('|','；')}。",f"- Title：{r['proposed_title']}",f"- Description：{r['proposed_description']}",f"- 改造要点：{r['implementation_note']}"]
lines+=['','## 其他页面的归属','',
'| 页面 | 搜索/产品用途 | 索引建议 |','|---|---|---|',
'| /faq | WhatHeThinks FAQ（品牌导航，未查量） | 保留；只讲产品使用、价格、隐私 |',
'| /privacy | WhatHeThinks privacy policy（未查量） | 保留信任页；不分非品牌获客词 |',
'| /terms | WhatHeThinks terms（未查量） | 保留信任页；不分非品牌获客词 |',
'| /analyze | 实际分析流程 | 保持 noindex |',
'| /sample-report | 样例和转化证据 | 保持 noindex |',
'| /r/[id] | 用户私有报告 | 保持 noindex |',
'| /account、/login、/signup、/forgot-password、/reset-password、/delete | 账号与数据管理 | 保持 noindex |',
'','## 下一阶段内容：先做三篇，不批量铺页面','',
'| 拟新增 URL | 主词 | 美国月均 | 与现有页的分工 |','|---|---|---:|---|',
'| /guides/export-whatsapp-chat | export whatsapp chat | 720 | 教程：导出步骤、格式、常见失败；链接平台分析页。不要混成聊天迁移教程 |',
'| /guides/dry-texting | dry texting | 3600 | 解释定义、例子、情境与应对；链接兴趣下降页。不能把短回复直接判为不喜欢 |',
'| /guides/double-texting | double texting | 2900 | 解释连续发送与如何判断上下文；链接主动发起工具。不能将连续两条消息算两次发起 |',
'',
'这三个词只是需求已验证的候选，不是低难度承诺。先完成现有页实质内容，再逐篇检查搜索结果并写有用示例。`situationship vs relationship`（1000/月）、`breadcrumbing examples`（720/月）、`how to tell if a guy likes you over text`（480/月）先做现有场景页的 H2，避免一上来拆分相同意图。',
'','## 防止页面互抢','',
'- 首页定义工具能力，场景页回答具体问题；首页的场景卡片只做摘要并链接，不复制各页整篇答案。',
'- 持续下降归 losing-interest，时好时坏归 mixed-signals，反复失联又回归且不落实计划归 breadcrumbing。三页用例子和判断边界区分。',
'- 前任发消息归 ex 页；breadcrumbing 通用解释仍由 breadcrumbing 页承接，互相链接。',
'- WhatsApp 导出操作由教程承接，平台工具页负责分析。其他平台目前只有粘贴能力，先在现有入口解释，不为少量搜索做四个同模板页。',
'- 谁先开始、消息数量、回复速度是不同指标；别把 who texts more 当 who texts first 的同义词。',
'- Title、H1、开头回答、核心 H2 和内链锚文本自然围绕主意图组织；不用堆关键词或写 meta keywords。',
'','## 数据局限与费用','',
'本轮仅查量、CPC、广告竞争度和月度历史；**广告 LOW 不等于 SEO 难度低**。近似词可被 Google Ads 合并，不能把这些词的量相加当总流量。候选 CSV 中 page 是研究分类，非最终发布分配；只有 page-keyword-map.csv 是主词定稿建议。',
'',
'1000 词批次中仍包含少量歧义/错配的对照查询，例如 define the relationship 可能混有漫画意图，response time calculator 混有技术计算意图；who starts a conversation like this、why do avoidants take so long to reply 等残留项排除，不进入主词和内容清单。原始批次和响应保留，便于核对花费与结果，未为剔除项补发付费请求。',
'',
'词表中的 business_fit 是粗筛人工判断，不是供应商指标；主要页面在 page-keyword-map.csv 另给了最终匹配评分。没有计算伪精确机会分数，因为缺少 SEO 难度、可靠 SERP 排名和本站 GSC 数据。',
'',
'[官方接口：1000 词/次、近似词可能合并](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)；[官方价格：Live $0.09/任务](https://dataforseo.com/pricing/keywords-data/google-ads)。实际 cost=0.09 已保存在 dataforseo-response.json。方法、来源和缓存规则见 methodology.md。',
'','## 交付文件','',
'- page-keyword-map.csv：10 个获客页的主词、数据、辅助词、拟定 Title/Description、改造要求。',
'- validated-keywords.csv：1000 个词的 API 指标；空值与 0 分开。',
'- batch-1000.csv：实际提交的 1000 个唯一词及来源。',
'- dataforseo-response.json：完整 API 响应，含逐月搜索量；不含认证信息。',
'- candidate-pool.csv / reviewed-pool.csv：候选池和粗筛池，未选入首批的词留待后续攒满再查。',
'',
'实施后用 GSC 按 query/page 看曝光、点击与 CTR；若同一意图由多个 URL 交替出现，先收拢内容和内链再决定合并。不能仅因一个工具词暂无量就删除实用工具，也不应为每个近似词新建页面。']
(out/'keyword-plan.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Wrote page-keyword-map.csv and keyword-plan.md; no API calls')
