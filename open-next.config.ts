import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 站点没有 ISR/重新验证，预渲染页面直接从静态资源读取。
// 不配置时默认缓存为空，generateStaticParams + dynamicParams=false 的落地页在 Worker 中会 404。
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
