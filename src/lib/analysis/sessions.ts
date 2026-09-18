/**
 * §2 会话切分。输入为已映射角色、按 ts 升序的消息。
 */

import { CONFIG } from "./config";
import type { Msg } from "./types";
import type { Role, Session } from "./analysis-types";

export interface RoleMsg extends Omit<Msg, "sender"> {
  sender: Role;
}

/** 该切分点是否属于夜间空档：间隔 ≥6h 且 <12h，且在早晨 5–11 点恢复。 */
function isOvernightGap(prevTs: number, curTs: number): boolean {
  const gap = curTs - prevTs;
  if (gap >= CONFIG.OVERNIGHT_MAX_MS) return false;
  const hour = new Date(curTs).getUTCHours();
  return hour >= 5 && hour <= 11;
}

export function buildSessions(msgs: RoleMsg[]): Session[] {
  const sessions: Session[] = [];
  if (msgs.length === 0) return sessions;

  let start = 0;
  let prevSessionEndTs = msgs[0].ts;

  const push = (startIdx: number, endIdx: number, overnight: boolean) => {
    const gapFromPrev =
      sessions.length === 0 ? Infinity : msgs[startIdx].ts - prevSessionEndTs;
    sessions.push({
      startIdx,
      endIdx,
      startTs: msgs[startIdx].ts,
      endTs: msgs[endIdx].ts,
      initiator: msgs[startIdx].sender,
      isReengage: gapFromPrev >= CONFIG.REENGAGE_GAP_MS,
      isOvernight: overnight,
    });
    prevSessionEndTs = msgs[endIdx].ts;
  };

  let pendingOvernight = false;
  for (let i = 1; i < msgs.length; i++) {
    const gap = msgs[i].ts - msgs[i - 1].ts;
    if (gap >= CONFIG.SESSION_GAP_MS) {
      push(start, i - 1, pendingOvernight);
      pendingOvernight = isOvernightGap(msgs[i - 1].ts, msgs[i].ts);
      start = i;
    }
  }
  push(start, msgs.length - 1, pendingOvernight);
  return sessions;
}
