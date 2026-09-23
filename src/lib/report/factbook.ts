/**
 * FactBook：报告里出现的每个数字/日期都必须经由这里格式化并登记。
 * Claim Checker 只放行已登记的字符串，任何未登记的数字都视为"编造"。
 * 详见 docs/prompt-architecture.md §1、§6。
 *
 * 计数必须带单位一起登记（"3 concrete plans"），避免裸数字 "3" 放行所有的 3。
 */

import { fmtDateLong, fmtMinutes, fmtPct } from "@/lib/format";

export class FactBook {
  private readonly allowed = new Set<string>();

  private reg(s: string): string {
    this.allowed.add(s);
    return s;
  }

  /** 0–1 → "48%" */
  pct(x: number): string {
    return this.reg(fmtPct(x));
  }

  /** 分钟 → "2h 31m" */
  minutes(x: number): string {
    return this.reg(fmtMinutes(x));
  }

  /** ts → "March 5" */
  date(ts: number): string {
    return this.reg(fmtDateLong(ts));
  }

  /** 带单位的计数："1 concrete plan" / "3 concrete plans" */
  count(n: number, one: string, many: string): string {
    return this.reg(`${Math.round(n)} ${Math.round(n) === 1 ? one : many}`);
  }

  /** 一位小数的比率："0.3/week" */
  rate(x: number, unit: string): string {
    return this.reg(`${x.toFixed(1)}${unit}`);
  }

  /** 每周频率，用人话写："about 2 a week" / "less than one a week" / "none"。 */
  weekly(x: number): string {
    if (x < 0.05) return this.reg("none");
    if (x < 0.95) return this.reg("less than one a week");
    return this.reg(`about ${Math.round(x)} a week`);
  }

  /** 倍数："2.6×" */
  times(x: number): string {
    return this.reg(`${x.toFixed(1)}×`);
  }

  /** 字符数："42 characters" */
  chars(x: number): string {
    return this.count(x, "character", "characters");
  }

  /** 模板里的固定数字短语（如 "8 weeks"、"3+ days"），必须显式登记。 */
  constant(s: string): string {
    return this.reg(s);
  }

  /** 按长度降序，便于检查器先匹配长串。 */
  list(): string[] {
    return [...this.allowed].sort((a, b) => b.length - a.length);
  }
}
