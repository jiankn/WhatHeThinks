# WhatHeThinks 首页文案与关键词诊断

日期：2026-09-19。审阅对象：当前本地首页源码与渲染 HTML，非线上部署确认。已核对平台支持、上传数据、隐私页、定价与专题页。未接入 GSC、搜索量、KD 或转化数据；关键词建议为待验证的定位方向。本轮没有修改网站文案。

## 结论

首页有一致的品牌表达，但工具类别、使用过程和限制说明不足。主要改进方向是让访客更快理解“输入什么、得到什么、哪些免费、哪些数据会发送”。不需要靠重复关键词或增加字数解决。

## 证据与建议

| 优先级 | 观察到的文案或结构 | 用户与 SEO 影响 | 建议 |
| --- | --- | --- | --- |
| 高 | Title 为 WhatHeThinks — Read the Pattern Behind His Texts；H1 同样围绕 pattern | 搜索结果和首屏没有直接说明这是聊天分析工具 | Title 加入 Relationship Text Analyzer；首屏说明 WhatsApp 输入与具体输出 |
| 高 | Your full chat stays in your browser; sensitive details are redacted. | 完整聊天留在本地属实，但容易让人误以为任何消息内容都不会发送；sensitive details 范围过宽 | 明确会发送统计和最多 120 条脱敏摘录。实际替换参与者姓名、邮箱、电话和链接；不要声称完全匿名 |
| 高 | how-it-works 区域是理念段落，没有操作流程 | 用户不知道开始分析前需要准备什么 | 简述导入聊天、确认人物、查看免费预览；按实际功能说明预览和完整报告的区别 |
| 中 | 首屏有 Free preview，$9.99 完整报告价格在页面底部 | 免费与付费边界获知较晚 | 首屏按钮下补充 Free preview · Full report $9.99 · One-time payment |
| 中 | 已区分 WhatsApp TXT/ZIP 导入与其他平台粘贴，但没写无时间戳限制 | 多平台展示可能让人误解为分析能力完全相同 | 补充 Reply-time and trend analysis require timestamps. |
| 中 | Spot the week... changed；messages behind every finding | 短聊天、稳定聊天或无时间戳数据不保证有转折；每项结论不一定都对应单条消息 | 改成 See whether reply times or consistency changed over time；Review the metrics and selected messages behind your report |
| 中 | main 文本约 334 个空白分词，pattern/patterns 出现 7 次；正文 9 个链接均指向分析流程或样例 | 品牌词反复出现但具体信息不足；专题页主要依靠页脚入口 | 用流程、指标和限制替代重复口号；在相关问题旁补充 2–3 个专题或工具入口 |

## 首屏文案建议

Title：WhatHeThinks — Relationship Text Analyzer

Meta description：Analyze your relationship texts for reply times, who texts first, and changes in effort. Start with a free preview of your WhatsApp chat.

小标题：Relationship text analyzer

H1：Read the pattern behind his texts.

副标题：Import your WhatsApp chat to compare reply times, who texts first, and how effort changes over time.

按钮：Analyze my chat

按钮旁说明：Free preview · Full report $9.99 · One-time payment

隐私补充：Your full chat stays on your device. We send statistics and up to 120 excerpts with participant names, emails, phone numbers, and links replaced to create your report.

这些是建议稿，未写入页面。H1 不必强行重复主关键词，重要的是邻近的可见文本明确说明产品用途。

## 候选关键词分工

| 页面 | 建议承担的搜索意图 |
| --- | --- |
| 首页 | relationship text analyzer；relationship chat analysis |
| /whatsapp-relationship-analyzer | WhatsApp relationship analyzer 与导出分析 |
| /does-he-like-me-text-analyzer | does he like me text analyzer |
| /mixed-signals-text-analyzer | mixed signals text analyzer |
| /tools/who-texts-first | who texts first 与主动发起比例 |
| /tools/reply-time-calculator | reply time calculator |

这是页面职责规划，不是已确认的关键词蚕食，也不代表已验证搜索量或排名难度。不建议以泛词 text analyzer 为唯一方向；不要宣传截图识别、完全免费完整报告或未实现的原生平台导入。

## 已具备与不应误判的内容

- 首页有一个 H1、完整 meta description（129 字符）、生产域名 canonical、图片 alt 和 Organization / WebSite / WebApplication 结构化数据。
- 334 词或 8 个正文 H2 本身不是 SEO 错误，不为字数或标题数量扩写。
- Organization 缺少 logo 是可改进项，不是必填字段缺失；多个相关实体一起出现不是结构化数据冲突。不提供站内搜索时，无需伪造 SearchAction。
- sample report、免费预览、非订阅价格、无法读心的边界说明值得保留。
- 示例问题明确说明不是用户评价，这一点应保留；若移除头像，才可简化重复的示例标签。
- 不需要添加 meta keywords，Google 不使用该标签。

## 核验说明与来源

页面脚本不接受 localhost，因此使用本地 HTTP 提取当前渲染 HTML；结构化数据脚本使用缓存 HTML 运行后，按 Google 官方文档进行了人工复核。Agent Reach 的 Exa 入口失败，采用可用网页检索。线上 robots、sitemap、重定向和索引状态不在本次文案审阅范围。

- [Google：标题链接](https://developers.google.com/search/docs/appearance/title-link)
- [Google：搜索结果摘要与描述](https://developers.google.com/search/docs/appearance/snippet)
- [Google：SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google：Organization 结构化数据](https://developers.google.com/search/docs/appearance/structured-data/organization)
