import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const development = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // static.cloudflareinsights.com / cloudflareinsights.com: Cloudflare Web Analytics 自动注入的统计脚本与上报
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com${development ? " 'unsafe-eval'" : ""}`,
  // www.gstatic.com: Chrome 翻译注入的样式表，否则翻译后的界面样式会错乱
  "style-src 'self' 'unsafe-inline' https://www.gstatic.com",
  `connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com${development ? " ws: wss:" : ""}`,
  "frame-src 'self' https://challenges.cloudflare.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

// 让 `next dev` 能通过 getCloudflareContext() 拿到本地模拟的 D1 等绑定。
initOpenNextCloudflareForDev();
