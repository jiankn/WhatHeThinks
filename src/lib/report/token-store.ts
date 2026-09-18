/**
 * 报告访问 token 的浏览器端存储。URL 用 #t= 片段传 token（不进服务器日志），
 * 同时存 localStorage 以便用户回访。存储不可用时静默失败。
 */

const key = (id: string) => `wht:r:${id}`;

export function saveToken(id: string, token: string): void {
  try {
    localStorage.setItem(key(id), token);
  } catch {
    // 隐私模式等场景下不可用
  }
}

export function loadToken(id: string): string | null {
  try {
    return localStorage.getItem(key(id));
  } catch {
    return null;
  }
}

export function clearToken(id: string): void {
  try {
    localStorage.removeItem(key(id));
  } catch {
    // ignore
  }
}

/** 从 location.hash 读取 #t=，有则存下。 */
export function tokenFromHash(id: string): string | null {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
  if (t) saveToken(id, t);
  return t ?? loadToken(id);
}
