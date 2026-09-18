import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// 让 `next dev` 能通过 getCloudflareContext() 拿到本地模拟的 D1 等绑定。
initOpenNextCloudflareForDev();
