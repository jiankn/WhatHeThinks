/**
 * 服务端访问 Cloudflare 绑定（D1）与环境变量。
 * 本地 `next dev` 下由 initOpenNextCloudflareForDev() 模拟，读取 wrangler.jsonc 与 .dev.vars。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getEnv(): Promise<CloudflareEnv> {
  return (await getCloudflareContext({ async: true })).env;
}

export async function getDB(): Promise<D1Database> {
  return (await getEnv()).DB;
}
