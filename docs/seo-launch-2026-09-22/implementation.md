# 三阶段 SEO 页面建设交付

日期：2026-09-22。完成本地实现，未部署。线上收录、搜索排名和付费转化仍需上线后验证。

## 执行清单

- [x] 升级现有10个获客页：首页、7场景页、2统计工具页。
- [x] 第一阶段新增8页：texting-styles、questions-to-ask-your-boyfriend、dry-texting、conversation-starters-for-couples、dating-intentions、situationship-vs-relationship、conversation-starters-over-text、should-i-text-my-ex。
- [x] 第二阶段新增7页：questions-to-ask-your-crush、how-to-keep-a-conversation-going、left-on-read、flirting-examples、relationship-check-in-questions、texting-after-first-date、love-bombing-vs-genuine-interest。
- [x] 第三阶段新增5页：situationship、ghosting、breadcrumbing、talking-stage、love-bombing。
- [x] /guides目录按4个主题组织；首页、导航、页脚及相关内容接入。
- [x] 各页独立元信息、自引用canonical、结构化数据和服务端正文；新增20页均静态生成。
- [x] 内容包含场景问题清单、对话实例、对比表、反例和具体行动建议；清单和消息支持复制，目录支持锚点导航。
- [x] 现有场景页专属回答提前至共享报告展示前；喜欢页覆盖更宽的判断需求，breadcrumbing示例页与概念指南分工。

总计30个获客页，另加/guides和/faq，sitemap共32页。主词分配见page-keyword-map.csv。没有增加/tools重定向，没有新增平台导入能力，没有把私人报告纳入索引。

## 新补查的主题词

保留已有DataForSEO搜索量，未再次调用DataForSEO。哥飞新增4次报告：situationship KD62.2、ghosting 51.2、breadcrumbing 58.9、love bombing原始52.9/常规69.7（普通短语被误标为brand）。此前talking stage为52.2。原始报告见topic-kd-results.json。接口没有返回费用金额。

这些主题是长期覆盖页，不能描述为容易获得排名。概念页先回答读者问题，再链接实际分析；love bombing页明确分析工具不能判断安全或诊断，提供已核对的love is respect来源。

## 工程组织

- src/content/guides.ts：20页独立内容和相关链接。
- src/content/scenario-guidance.ts：现有7场景页的新增专属回答。
- src/components/guides/GuidePage.tsx：服务端正文、目录、表格、FAQ、来源、分析CTA、相关内容。
- src/components/guides/CopyMessage.tsx：复制清单与示例的客户端交互，失败时提示选择文本复制。
- src/app/guides.css：居中限宽、移动端布局、表格区域滚动。
- src/app/[slug]/page.tsx：新增指南静态路由与元信息；保留场景路由。

## 验收

- npm run build：通过，含TypeScript与Next构建检查。
- npm test：9个测试文件、72项测试通过。
- python scripts/audit-seo-pages.py：32个sitemap页面HTTP200；37个内部目的路径有效；标题/描述唯一、单H1、自引用canonical、无错误noindex、结构化数据JSON可解析、目录锚点有效、无孤立页。
- /analyze与/sample-report保留noindex；旧/tools地址和未知指南返回404。
- 浏览器验收通过：7个代表页面×320/390/1280宽度，共21组布局，无页面横向溢出；复制清单（含剪贴板内容）、FAQ展开、分析入口通过，无未捕获JS异常。结果与截图保存在reports/seo-launch-2026-09-22。

本地预览：http://localhost:3000/guides 。运行的是生产预览服务器，后续修改代码需要重新构建或改用开发服务器。
