/**
 * 上传与分析的"可感知节奏"。
 * 真实计算在本地几十毫秒就完成，但结果一闪而过会让人觉得不靠谱；
 * 这里只控制"展示节奏"，展示的每个数字都来自用户自己的聊天，不编造。
 */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 按用户的动效偏好缩放时长：开启"减少动态效果"时压到约 1/3。 */
export function paced(ms: number): number {
  return reducedMotion() ? Math.round(ms * 0.3) : ms;
}

/** 给时长加 ±spread 的随机抖动，避免匀速推进显得机械。 */
export function jitter(ms: number, spread = 0.2): number {
  return Math.round(ms * (1 - spread + Math.random() * spread * 2));
}

export interface Signal {
  bars: 1 | 2 | 3 | 4;
  label: string;
  hint: string;
}

/** 消息量 → 信号强度。消息越多，模式越清晰。 */
export function signalFor(count: number): Signal {
  if (count < 300) return { bars: 1, label: "Light signal", hint: "Enough to start. A longer export gives a clearer read." };
  if (count < 1000) return { bars: 2, label: "Okay signal", hint: "More messages = a stronger signal for the analysis." };
  if (count < 5000) return { bars: 3, label: "Good signal", hint: "Plenty of history to find real patterns." };
  return { bars: 4, label: "Strong signal", hint: "A long history. Patterns will be very clear." };
}
