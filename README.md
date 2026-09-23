# WhatHeThinks

女性向 AI Dating Chat Analyzer。上传 WhatsApp 聊天，看清男方的兴趣、投入与变化信号。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm test           # 单元测试 (vitest)
npm run typecheck  # 类型检查
npm run build      # 生产构建
```

## 本地环境

```bash
cp .dev.vars.example .dev.vars   # 本地密钥（已 gitignore）
npm run db:migrate:local         # 本地 D1 建表
node --version                   # 需要 Node 20+
```

- 不填 `STRIPE_SECRET_KEY` 且 `DEV_UNLOCK=1` 时，付费按钮直接解锁（仅开发用）。
- 报告先用 DeepSeek（`DEEPSEEK_API_KEY`）写，不合格再换智谱 GLM（`FALLBACK_API_KEY`，模型见 `wrangler.jsonc` 的 `GLM_MODEL`）。两个都没配时阻止新结账，不生成模板报告。失败原因记在 `events` 表（`generate_failed` / `generate_fallback`）。
- 生产登录、注册和密码重置由 Cloudflare Turnstile 保护；公开 Site Key 在 `wrangler.jsonc`，Secret 只存于 Cloudflare。
- 测试 Stripe：填入 test mode 的 `sk_test_…`，用测试卡 `4242 4242 4242 4242` 付款。付款回跳时服务器会主动向 Stripe 确认，本地不配 webhook 也能完成。
- 测试 webhook：`stripe listen --project-name whathethinks --forward-to localhost:3000/api/stripe/webhook`，把输出的 `whsec_…` 填入 `STRIPE_WEBHOOK_SECRET`。
- Stripe 用独立的 WhatHeThinks 账户，CLI 配置名 `whathethinks`（命令都加 `--project-name whathethinks`）。产品 "WhatHeThinks Full Report" 的价格 ID 填 `STRIPE_PRICE_ID`，lookup key `whathethinks_full_report_usd_1990`。
- 账户开着 Managed Payments（Stripe 代收代缴销售税/VAT），产品必须带税码 `txcd_10000000`（电子服务），否则建结账会报错。
- 手动测试用的聊天样例：`npx vite-node scripts/make-sample-chat.ts sample.txt`

## 部署（Cloudflare）

```bash
npx wrangler d1 create whathethinks      # 把返回的 database_id 填进 wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put STRIPE_SECRET_KEY    # 以及 STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID / RESEND_API_KEY
npm run deploy
```

生产环境**不要**设置 `DEV_UNLOCK`。

DeepSeek 接入与 Cloudflare 控制台 / CLI 配置步骤见 [配置指引](docs/deepseek-cloudflare-setup.md)。报告输出固定为英文。

## 文档

见 `docs/`：商业计划、关键词研究、PRD、信号评分规范、Prompt 架构。

## 里程碑

- [x] M1 项目脚手架 + WhatsApp 解析器 + 测试
- [x] M2 分析引擎（会话/指标/趋势/转折点/混合信号/证据）
- [x] M3 /analyze 流程 + 免费预览 + D1
- [x] M4 mock 报告 + 证据展示
- [x] M5 Stripe 测试支付 + webhook
- [x] M6 首页 + 落地页 + 免费工具
