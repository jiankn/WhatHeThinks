# DeepSeek + Cloudflare 配置指引

更新：2026-09-22。项目为 Next.js + OpenNext，部署在 Cloudflare Worker `whathethinks`。

## 接入方式

Cloudflare Worker 通过 HTTPS 调用 DeepSeek 官方 API，固定地址 `https://api.deepseek.com/chat/completions`。无需 Workers AI binding 或 AI Gateway，无需前端密钥。

| 配置项 | 类型 | 值 / 来源 |
|---|---|---|
| `DEEPSEEK_API_KEY` | Secret | 在 DeepSeek 平台创建的 API Key |
| `DEEPSEEK_MODEL` | 普通变量 | `deepseek-flash`，已写入 `wrangler.jsonc` |

模型名称按照本次核对的 [DeepSeek 官方模型文档](https://api-docs.deepseek.com/quick_start/pricing)配置。以后更换模型，请修改 `wrangler.jsonc` 并重新生成类型、测试、部署。项目已设置 `keep_vars: true`，保留未在配置文件声明的控制台普通变量；同名变量仍以仓库配置为准。

Google 登录的公开 `GOOGLE_CLIENT_ID` 已同步到 `wrangler.jsonc`。`GOOGLE_CLIENT_SECRET` 必须保留为 Cloudflare Secret，不要写进仓库。控制台黄色“Update your Wrangler configuration”提示表示配置需要同步，并不是密钥错误。部署前应确保其他自动部署来源也使用此配置，旧配置仍可能覆盖控制台变量。

## Cloudflare 控制台

1. 在 [DeepSeek 平台](https://platform.deepseek.com/) 创建 API Key，确认 API 账户有可用余额。
2. Cloudflare → **Workers & Pages** → **whathethinks** → **Settings** → **Variables and Secrets** → **Add**。
3. 类型选 **Secret**，名称填 `DEEPSEEK_API_KEY`，值填密钥，保存并应用到生产版本。不要使用 `NEXT_PUBLIC_` 前缀，不要把密钥放进仓库或聊天。
4. 部署本次代码：在项目目录执行 `npm run deploy`，或运行已有部署流水线。仅添加密钥不会改变旧版模板逻辑。
5. 生产环境不要设置 `DEV_UNLOCK=1`。Stripe、D1、域名沿用原配置。

[Cloudflare Secret 官方说明](https://developers.cloudflare.com/workers/configuration/secrets/)。

## PowerShell / CLI（与控制台二选一）

```powershell
Set-Location C:\antigravity\WhatHeThinks
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
# 在交互提示中输入密钥，不要把密钥写进命令。
npm run deploy
```

`wrangler secret put` 会更新部署版本。此项目 Worker 已存在，无需重新创建 D1、域名或 Worker。

## 本地验证

在已有 `.dev.vars` 中填写 `DEEPSEEK_API_KEY`，保留原有配置，不要用示例覆盖密钥。

```dotenv
DEEPSEEK_API_KEY=在此填写自己的密钥
```

重启 `npm run dev`，用虚构聊天创建报告。免支付验收可清空本地 `STRIPE_SECRET_KEY` 并设置 `DEV_UNLOCK=1`；仍会调用真实 DeepSeek 并消耗 API 余额。不要在生产启用开发解锁。

验收：中文自定义问题得到英文报告；首屏回应具体疑问；证据可核对；没有反证时不虚构；无时间戳输入不产生时间趋势。私有报告响应应含 `report.meta.writer: "llm"`、所选模型名、`report.narrative.language: "en"`。勿公开报告 URL 或 token。

## 故障与限制

- 缺少密钥时，收款前阻止新结账。检查正确的 Worker 和环境是否配置 Secret。
- 账户余额不足、密钥无效或模型不可用，需要到 DeepSeek 平台处理。这些问题只能在调用时发现。
- 输出不合格、超时或临时服务错误最多尝试两次，每次 45 秒；401 等不可重试错误直接失败。
- 最终失败时标记报告为 failed，不冒充 AI 返回模板。Stripe 真实支付沿用自动退款流程；开发解锁无真实付款。用户可从新预览开始，退款后的旧订单不提供无限免费重试。
- Cloudflare Logs 中可筛选 `generate_failed`。日志不含聊天文本、密钥或供应商响应正文。
- 历史报告不自动改写。新生成的分析文字固定英文；证据抽屉保留原始消息以便核对，不篡改原文。
- 本地模拟 API 测试不能代替真实模型质量验收；填入密钥后仍需用虚构聊天做端到端检查。

接口参考：[JSON Output](https://api-docs.deepseek.com/guides/json_mode)、[Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)。实现关闭 thinking，使用 JSON 模式，不展示或保存推理过程。
