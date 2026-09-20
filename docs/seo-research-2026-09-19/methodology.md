# WhatHeThinks 关键词研究方法

研究日期：2026-09-19。市场假设：美国、英语，面向希望理解恋爱聊天中投入、回应、变化趋势的用户。不是全球搜索量。

## 页面分工

- 首页：关系聊天分析工具的总入口。
- 场景页：喜欢、兴趣下降、混合信号、未定义关系、breadcrumbing、前任回头。
- WhatsApp 页：平台导出聊天分析，强调关系用途。
- 两个统计工具：主动发起比例、回复时间。统计功能与“该不该先发消息”的建议意图分开。
- FAQ：品牌帮助页；隐私、条款：信任页，不强配非品牌获客词。
- analyze、sample-report、用户报告和账号流程：当前 noindex，保留转化/服务作用，不与获客页抢词。

一个页面围绕一个主搜索意图组织，可覆盖多个同义查询。1000 个词是筛选池，不代表新增 1000 个页面。CSV 的 page 字段是初步意图归属，不是每个词都应该强塞进该 URL。

## 候选来源与筛选

1. 读取 sitemap、实际路由、元数据、落地页内容、产品能力和现有 docs/keyword-research.md。
2. 人工定义与产品匹配的工具、情境、问题种子词。
3. 从 Google 公开 autocomplete 获取英语建议。建议不代表已确认搜索量，gl=us/hl=en 也不等于严格美国样本。
4. 去重、长度检查，排除歌曲、小说、代码、诊断、截图识别等无关/不支持意图，再人工审查批次。
5. 满 1000 个唯一相关词才调用 DataForSEO；其余候选留待下批，不零散补查。

## API 与预算

选择 DataForSEO Google Ads Search Volume Live，一次任务 1000 词，官方标价 $0.09。Standard $0.06 但预计等待 1–3 小时；本次选择一次 Live 在当前研究中取得结果。实际费用以返回 cost 为准。

- 不调用 Labs、付费 SERP、外链或 clickstream 附加数据。
- 不把广告竞争度当 SEO KD。本次 SEO KD / 结构难度均未查询。
- 不把 null、未返回指标改写为 0，不把同义词搜索量简单相加。
- Google Ads 可能合并近似变体；返回量是估算需求，不能当唯一独立用户或本站可获得流量。
- 保留原始响应与请求指纹，重复运行读取缓存；若已发起请求但没有保存响应，拒绝自动重试以防重复计费。
- API 密钥只从 Windows Credential Manager 读取到进程内存，不写入项目或日志。

## 初步搜索结果观察

这里只做页面类型判断，不声称获得完整美国 Google 排名或量化排名难度。

- [Lucen relationship text analysis](https://lucen.app/relationship-text-analysis)：工具型页面支持首页的关系聊天分析定位。
- [Relationship text analyzer](https://messageintentionanalyzer.com/relationship-text-analyzer)：截图型竞品说明同一工具词也可能有截图需求；本站需清楚说明仅导出文本或粘贴消息。
- [IDRlabs situationship test](https://www.idrlabs.com/situationship/test.php)：test/quiz 有问卷预期，不能只因量高把聊天分析器包装成心理测验。
- [WhoTextsMore](https://whotextsmore.com/)：who texts more 指消息数量；本站 who texts first 指会话主动发起，不可混用。
- [DailyUtili WhatsApp Chat Analyzer](https://dailyutili.com/tools/whatsapp-chat-analyzer/)：平台大词有免费统计工具需求，付费关系报告页需要先提供清楚的统计预览和付费边界。

## 官方依据

- [接口：一次最多 1000 词、相同任务价格、近似变体可能合并](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)
- [价格：Standard $0.06 / Live $0.09](https://dataforseo.com/pricing/keywords-data/google-ads)
- [Labs Keyword Overview 最多 700 词，与此次接口不同](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/)

后续优先用 GSC 的真实 query / page / impressions / CTR 调整主词。当前没有读取 GSC，因此不声称已有排名、点击或流量增长。
