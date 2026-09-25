/**
 * IndexNow（主动通知 Bing、Yandex 等搜索引擎“这些网址有更新”的协议）提交脚本。
 *
 * 用法：
 *   node scripts/indexnow.mjs --snapshot old.xml        保存线上 sitemap，供部署后对比
 *   node scripts/indexnow.mjs --wait-build <buildId>    等到线上跑的是这个构建（Next.js buildId）
 *   node scripts/indexnow.mjs --changed-since old.xml   只提交相对 old.xml 新增或 lastmod 变了的网址
 *   node scripts/indexnow.mjs --all                     提交 sitemap 里的全部网址
 *
 * 密钥文件 public/<KEY>.txt 必须已经在线上，否则 IndexNow 会拒绝（403）。
 */

import { readFileSync, writeFileSync } from "node:fs";

const SITE = "https://whathethinks.com";
const HOST = new URL(SITE).host;
const KEY = "1de3a73c0c550dd4735a561ead954a7d";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`${url} 返回 ${res.status}`);
  return res.text();
}

/** 解析 sitemap，返回 Map<网址, lastmod>。 */
function parseSitemap(xml) {
  const map = new Map();
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "";
    if (loc) map.set(loc, lastmod);
  }
  return map;
}

/** 轮询直到线上出现这个 buildId 的静态文件，说明新版本已经部署完成。 */
async function waitForBuild(buildId, timeoutMin = 25) {
  const url = `${SITE}/_next/static/${buildId}/_buildManifest.js`;
  const deadline = Date.now() + timeoutMin * 60_000;
  while (Date.now() < deadline) {
    const res = await fetch(url, { method: "HEAD" }).catch(() => null);
    if (res?.ok) {
      console.log(`线上已是构建 ${buildId}`);
      return;
    }
    console.log(`构建 ${buildId} 还没上线（${res?.status ?? "网络错误"}），30 秒后再查`);
    await sleep(30_000);
  }
  throw new Error(`等了 ${timeoutMin} 分钟，构建 ${buildId} 仍未上线`);
}

async function submit(urls) {
  if (urls.length === 0) {
    console.log("没有新增或更新的网址，不提交");
    return;
  }
  const key = (await fetchText(KEY_LOCATION)).trim();
  if (key !== KEY) throw new Error(`线上密钥文件内容不对：${KEY_LOCATION}`);

  // 单次最多 10000 个网址，这个站远用不到，不分批。
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });
  const body = await res.text();
  // 200 = 已收到；202 = 已收到但密钥还在验证中。两者都算成功。
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow 返回 ${res.status}：${body}`);
  }
  console.log(`已提交 ${urls.length} 个网址（HTTP ${res.status}）：`);
  for (const u of urls) console.log(`  ${u}`);
}

const [flag, arg] = process.argv.slice(2);

if (flag === "--snapshot") {
  writeFileSync(arg, await fetchText(`${SITE}/sitemap.xml`));
  console.log(`已保存线上 sitemap 到 ${arg}`);
} else if (flag === "--wait-build") {
  await waitForBuild(arg);
} else if (flag === "--changed-since") {
  const before = parseSitemap(readFileSync(arg, "utf8"));
  const after = parseSitemap(await fetchText(`${SITE}/sitemap.xml`));
  const changed = [...after].filter(([loc, mod]) => before.get(loc) !== mod).map(([loc]) => loc);
  await submit(changed);
} else if (flag === "--all") {
  await submit([...parseSitemap(await fetchText(`${SITE}/sitemap.xml`)).keys()]);
} else {
  console.error("用法见文件开头注释");
  process.exit(1);
}
