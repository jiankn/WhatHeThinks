/**
 * 落地页上选好的聊天文件，客户端跳转到 /analyze 后直接接着解析，用户不用再选一次。
 * 只存在内存里（同一页面会话内有效）；刷新后为空，/analyze 照常显示上传步骤。
 */

export type PendingChat =
  | { kind: "file"; file: File }
  | { kind: "text"; text: string };

let pending: PendingChat | null = null;

export function setPendingChat(file: File) {
  pending = { kind: "file", file };
}

export function setPendingChatText(text: string) {
  pending = { kind: "text", text };
}

/** 取出并清空，保证只被处理一次。 */
export function takePendingChat(): PendingChat | null {
  const chat = pending;
  pending = null;
  return chat;
}
