# WhatHeThinks：三轮关键词统一落地计划

实施更新（2026-09-22）：三个阶段已完成本地页面建设，30个获客页＋指南目录与FAQ。执行结果见[实施记录](seo-launch-2026-09-22/implementation.md)。以下保留原规划和决策依据。

状态：规划，尚未修改页面或部署。依据截至2026-09-21的3000个唯一查询词、两轮共36份哥飞KD报告和当前路由源码。此文件取代旧计划的建设顺序；旧研究保留作为证据。本次未增加API费用，也未完成运行时SEO验收。

## 定位与规模

面向希望理解恋爱聊天、判断互动投入并改善沟通的人。首页承接品牌和分析工具需求；内容覆盖“看懂聊天、判断关系、聊什么/怎么聊、前任与关系变化”。所有内容先回答问题，再引导使用分析器。

第一阶段升级10个现有获客页面（首页+7场景+2工具），新增8页，形成18页；第二阶段再新增7页，共25个主要获客页。另有/guides导航、FAQ、关于/分析方法/隐私等支持页，不用大词硬塞。数量是排期上限，不是必须发布的SEO指标；重复意图合并后数量可减少。大词专题为第三阶段候选，不计入25页。

一个页面一个主搜索意图。主词用于Title、H1和内容策划，近义词自然纳入正文，不能理解为一个页面只能出现一个关键词。搜索量为美国英语Google Ads月均估算，不代表可获得流量；近似变体不相加。KD为哥飞估计：误标brand的普通短语用接口genericScore比较，原始分在研究文件中保留；未查的词明确标记。

## 现有10页的职责

|页面|主关键词（US月量）|同页辅助词/意图|落地动作|
|---|---|---|---|
|/|text message analyzer（110）|What He Thinks（720，品牌兼需求表达）、relationship text analyzer、what does this text mean|Title建议What He Thinks — AI Text Message Analyzer；首屏说清恋爱聊天分析、样例、隐私、价格、导入方式。保留品牌，流量规模由内容页共同承担。|
|/does-he-like-me-text-analyzer|how to know if someone likes you（12100，KD23.6）|does he like me、how to tell if a guy likes you over text|实质升级为兴趣判断指南+分析入口，覆盖线下和文字线索、友好反例、直接沟通；分析功能明确聚焦You/Him。不要把泛someone词的完整需求强行压成上传入口。|
|/mixed-signals-text-analyzer|mixed signals（3600，KD未查）|mixed signals from a guy、hot and cold behavior|先解释不同信号和上下文，给矛盾行为实例及问清楚的说法，再展示分析；该大词是目标候选，竞争尚未验证。|
|/is-he-losing-interest|signs he is losing interest（480，KD30.4）|is he losing interest、he stopped texting|比较持续变化与忙碌，展示聊天趋势例子；不把一次慢回复判为失去兴趣。|
|/situationship-analyzer|situationship analyzer（10）|am i in a situationship（210）、分析我的互动|保留实际分析入口；不要同时承担完整situationship百科。|
|/breadcrumbing-test|breadcrumbing examples（720，KD41.4）|breadcrumbing texts、breadcrumbing test|以示例与反例为主体，提供不计伪科学分数的自查；没有实际问卷时不宣称有测试得分。|
|/ex-text-analyzer|does my ex want me back（110）|ex text analyzer、ex texting me|解释重新联系可能性、行为与承诺对照；与是否主动联系前任的决策页分开。|
|/whatsapp-relationship-analyzer|whatsapp chat analyzer（40）|WhatsApp relationship analysis、导出与上传|演示真实导入和输出，帮助用户完成任务；不能借其他平台词宣称尚未实现的导入。|
|/who-texts-first|who texts first（30）|who initiates conversations|保留实际统计工具、计算方法和边界。|
|/reply-time-calculator|reply time calculator（暂无量数据）|average reply time|保留有用工具，说明时区、睡眠、工作影响；不因无量而删除，也不作为主要流量投资。|

保留当前根目录路由，不为了短URL改名。项目未上线，不增加旧/tools/*重定向。现有喜欢页若无法完成宽意图内容升级，则保持窄词定位，暂缓12100词，不用标题承诺超出正文。

## 第一阶段新增8页

|顺序|URL / 主词|US月量|比较KD|内容交付与转化|
|---|---|---:|---:|---|
|1|/texting-styles — texting styles|3600|13.7|不同聊天风格的具体对话、比较维度、互相适应的方法；CTA分析自己的聊天模式。|
|2|/questions-to-ask-your-boyfriend — questions to ask your boyfriend|74000|29.6|按关系阶段和沟通目的筛选问题，给追问、使用场景和可复制内容；CTA用于沟通前回顾互动。最新两月49500，不能以均量承诺增长。|
|3|/dry-texting — dry texting|3600|29.4|短回复实例、正常简短与长期冷淡的区别、回应方式；链接聊天风格和兴趣变化。|
|4|/conversation-starters-for-couples — conversation starters for couples|6600|17.3|伴侣共同使用的日常交流活动、轮流回答与话题延伸；与boyfriend单方提问清单形成实际区别，若内容重合则合并。|
|5|/dating-intentions — dating intentions|1600|27.4|不同关系期待、如何问清楚、如何理解回答；连接mixed signals与situationship。|
|6|/situationship-vs-relationship — situationship vs relationship|1000|19.5|排他性、承诺、计划、期待对比表及边界沟通；连接situationship分析。|
|7|/conversation-starters-over-text — conversation starters over text|1000|25.9|文字开场、对方回复后的跟进、对话前后示例；what to text your crush（1000）先作为该页子场景，不立即另建同类页。|
|8|/should-i-text-my-ex — should i text my ex|1600|32.9|按联系目的、对方边界、历史互动组织决策流程与消息实例；连接前任分析页。|

执行批次：先完成新内容模板、升级喜欢页，并制作texting-styles与boyfriend清单；验证这些代表性页面后再生产剩余6页。不要把8篇都套同一个营销正文。

## 第二阶段新增7页

|URL / 主词|US月量|比较KD|页面区别|
|---|---:|---:|---|
|/questions-to-ask-your-crush|14800|49.2|初识到熟悉的兴趣了解；flirty questions to ask a guy（2900）先作为页内板块，不另开清单页。|
|/how-to-keep-a-conversation-going|5400|36.1|倾听、追问、分享、换话题的方法和完整对话，区别于开场句清单。|
|/left-on-read|3600|40.4|已读未回含义、情境差异、怎么处理；与dry-texting的“已回复但简短”区分。|
|/flirting-examples|1900|42|友好与暧昧的成对例子、文字和线下差别、容易误读的反例。|
|/relationship-check-in-questions|1300|28.6|结构化关系复盘议程：投入、期待、联系节奏、后续行动；区别于娱乐聊天话题。|
|/texting-after-first-date|590|31.3|首次约会后的联系、消息示例、邀约和未回复；ghosting after first date先并入。|
|/love-bombing-vs-genuine-interest|590|18|节奏、边界、言行一致性的对照与可靠来源；不做人格诊断，不承诺算法识别操纵意图。|

该阶段以内容准备和首批质量验收为依赖，不要求等排名出现才开工；上线后有GSC与转化数据就用于重新排序。

## 第三阶段：大词专题储备

|候选主词|US月量|拟定入口|前置条件|
|---|---:|---|---|
|situationship|74000|/situationship|补查主词SERP/KD，制作完整定义、表现、关系选择；与分析页区分解释与工具任务。|
|ghosting|49500|/ghosting|补查KD，先验证感情意图占比；以概念与应对为主。|
|breadcrumbing|22200|/breadcrumbing|补查KD，与现有示例页比较意图；若明显重叠，升级现有页并调整主词，不强开第二页。|
|talking stage|5400|/talking-stage|已查KD52.2；需要完整阶段指南和相关支持页。|
|love bombing|110000|/love-bombing|KD未查；需要可靠资料和明确内容能力，不能仅改写对比页。|

unrequited love（60500）、conversation starters（60500）、questions to ask a guy（40500）、first date questions（9900）暂存。它们有需求但未完成精评或意图更宽，不计作已验证优先机会。朋友群聊、占卜、名字配对、截图OCR等词不按现有功能建设工具页。

## 导航与内链

新增/guides作为人工策划导航，分“Understand his signals”“Texting patterns”“Better conversations”“Exes & uncertainty”，不是为每个标签生成可索引归档。

首页展示每类代表页；指南页都有实际可点击的相关内容链接，正文按读者下一步选择链接，而不是每篇都互链全部页面。示例：texting-styles → dry-texting → is-he-losing-interest → /analyze；boyfriend问题清单 → relationship-check-in-questions → /analyze；dating-intentions → situationship-vs-relationship → situationship-analyzer。

分析CTA按现有question id传递意图，实施时验证入口是否实际读取参数。清单读者先获得内容，不强制上传或注册。示例聊天明确为虚构，不能当作真实客户案例。

## 工程任务

- 当前src/app/[slug]/page.tsx只从LANDING_PAGES生成静态路由，dynamicParams=false。新增独立指南内容数据及渲染分支，静态参数纳入指南，校验slug唯一性。
- src/content/landing.ts维护场景内容；新增src/content/guides.ts维护主词、辅助意图、标题、描述、正文、来源、真实更新时间和相关页。
- 保留首页/场景营销组件；新增指南渲染组件支持说明、示例、清单、对比表、决策流程。关键正文服务端输出，复制/筛选等交互保持轻量。
- src/components/SiteHeader.tsx、SiteFooter.tsx加入指南入口；src/app/sitemap.ts仅加入已完成且可索引的页面，真实更新lastModified。
- 不扩展当前未支持的平台归档或问卷功能来迎合词表；产品扩展另行评估。

## 上线验收与反馈

逐页检查实际渲染：HTTP200、独立Title/description/H1、自引用canonical、正文无需操作即可阅读、内链有效、移动端布局、无内容与功能承诺冲突。每页按页面类型提供实质价值，不设机械字数。

/analyze、样例报告和私人报告、账户等保持各自访问/索引策略；私人数据的保护依靠鉴权，不能依靠noindex。仅合格公开页进sitemap；noindex页面须允许抓取才能读取指令。

上线后按主题查看GSC非品牌曝光、点击、搜索词与落地页匹配；业务查看内容到分析启动、完成分析、购买，不采集聊天正文。曝光高点击低检查标题与意图，访问高转化低检查CTA和人群，已抓取未收录检查内容与重复，不按固定天数承诺收录或排名。

内容质量依据：[Google Search Central：Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)。关键词证据见seo-round3-2026-09-21/combined-3000-keywords.csv、shortlist.csv和前两轮原始API结果。此计划是编辑和产品判断，不是API自动生成的排名预测。
