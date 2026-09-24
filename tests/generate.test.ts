import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { buildUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { genChat } from "./synth";

const mocks = vi.hoisted(() => ({
  write: vi.fn(), getReportRow: vi.fn(), getEvidence: vi.fn(), getAnalysis: vi.fn(), saveReport: vi.fn(), setStatus: vi.fn(), recordEvent: vi.fn(),
  getPregen: vi.fn((): { status: string; for: string; at: number } | null => null), focusKey: vi.fn((r: { question: string; custom_question: string | null }) => `${r.question}|${r.custom_question ?? ""}`),
  publishPregen: vi.fn(async () => true), claimPregen: vi.fn(async () => true), savePregen: vi.fn(async () => true),
}));
vi.mock("@/lib/server/llm-writer", () => ({ LlmReportWriter: class { name = "llm"; write = mocks.write; }, glmProvider: vi.fn(), deepseekProvider: vi.fn() }));
vi.mock("@/lib/server/reports", () => mocks);
import { generateReport, prepareReport } from "@/lib/server/generate";

beforeEach(() => { vi.clearAllMocks(); mocks.getPregen.mockReturnValue(null); });

describe("Report fulfillment fails closed", () => {
  const db = {} as D1Database;
  const env = { DEEPSEEK_API_KEY: "test-key", DEEPSEEK_MODEL: "deepseek-v4-pro" } as CloudflareEnv;

  it("does not save a template or mark ready after provider failure", async () => {
    mocks.getReportRow.mockResolvedValue({ question: "overview", custom_question: null });
    mocks.getEvidence.mockResolvedValue([]);
    mocks.write.mockRejectedValue(new Error("provider unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await generateReport(db, "test-id", env)).toBe(false);
      expect(mocks.setStatus).toHaveBeenCalledWith(db, "test-id", "failed");
      expect(mocks.recordEvent).toHaveBeenCalledWith(db, "generate_failed", "test-id", { reasons: ["Error"] });
      expect(mocks.saveReport).not.toHaveBeenCalled();
      expect(log.mock.calls.flat().join(" ")).not.toContain("provider unavailable");
    } finally { log.mockRestore(); }
  });

  it("refuses invalid non-claim prose instead of silently dropping claims and saving", async () => {
    const upload = buildUpload(analyzeRoleMsgs(genChat({ weeks: 12 })), { question: "overview", youName: "Emma", himName: "Jake" });
    const result = await new MockReportWriter().write({ reportId: "test-id", question: "overview", customQuestion: null, analysis: upload.analysis, evidence: upload.evidence });
    result.report.summary.headline = "He is definitely cheating.";
    mocks.getReportRow.mockResolvedValue({ question: "overview", custom_question: null });
    mocks.getEvidence.mockResolvedValue(upload.evidence);
    mocks.write.mockResolvedValue(result);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(await generateReport(db, "test-id", env)).toBe(false);
      expect(mocks.saveReport).not.toHaveBeenCalled();
      expect(warning.mock.calls.flat().join(" ")).not.toContain("cheating");
    } finally { error.mockRestore(); warning.mockRestore(); }
  });
});

describe("Report written before payment", () => {
  const db = {} as D1Database;
  const env = { DEEPSEEK_API_KEY: "test-key", DEEPSEEK_MODEL: "deepseek-v4-pro" } as CloudflareEnv;
  const row = { id: "test-id", question: "overview", custom_question: null, paid_at: null, report_json: "{}" };

  it("opens the pre-written report on payment without calling a model", async () => {
    mocks.getReportRow.mockResolvedValue(row);
    mocks.getPregen.mockReturnValue({ status: "ready", for: "overview|", at: 1 });
    expect(await generateReport(db, "test-id", env)).toBe(true);
    expect(mocks.publishPregen).toHaveBeenCalledWith(db, "test-id");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.recordEvent).toHaveBeenCalledWith(db, "generate_from_pregen", "test-id", {});
  });

  it("ignores a report written for a different focus and generates a fresh one", async () => {
    mocks.getReportRow.mockResolvedValue(row);
    mocks.getPregen.mockReturnValue({ status: "ready", for: "likes_me|", at: 1 });
    mocks.getEvidence.mockResolvedValue([]);
    mocks.write.mockRejectedValue(new Error("provider unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await generateReport(db, "test-id", env)).toBe(false);
      expect(mocks.publishPregen).not.toHaveBeenCalled();
      expect(mocks.write).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });

  it("waits for a report still being written, then opens it", async () => {
    vi.useFakeTimers();
    try {
      mocks.getReportRow.mockResolvedValue(row);
      mocks.getPregen.mockReturnValueOnce({ status: "pending", for: "overview|", at: 1 }).mockReturnValue({ status: "ready", for: "overview|", at: 2 });
      const pending = generateReport(db, "test-id", env);
      await vi.advanceTimersByTimeAsync(3_100);
      expect(await pending).toBe(true);
      expect(mocks.write).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it("pre-writes without ever marking the report ready, and records failures without refunds", async () => {
    const upload = buildUpload(analyzeRoleMsgs(genChat({ weeks: 12 })), { question: "overview", youName: "Emma", himName: "Jake" });
    const result = await new MockReportWriter().write({ reportId: "test-id", question: "overview", customQuestion: null, analysis: upload.analysis, evidence: upload.evidence });
    mocks.getReportRow.mockResolvedValue(row);
    mocks.getEvidence.mockResolvedValue(upload.evidence);
    mocks.write.mockResolvedValue(result);
    expect(await prepareReport(db, "test-id", env)).toBe("ready");
    expect(mocks.savePregen).toHaveBeenCalledWith(db, "test-id", "overview|", result.report);
    expect(mocks.saveReport).not.toHaveBeenCalled();
    expect(mocks.setStatus).not.toHaveBeenCalled();

    mocks.write.mockRejectedValue(new Error("provider unavailable"));
    expect(await prepareReport(db, "test-id", env)).toBe("failed");
    expect(mocks.savePregen).toHaveBeenLastCalledWith(db, "test-id", "overview|", null);
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it("does nothing for a paid report or when another request already claimed it", async () => {
    mocks.getReportRow.mockResolvedValue({ ...row, paid_at: 1 });
    expect(await prepareReport(db, "test-id", env)).toBe("skipped");
    mocks.getReportRow.mockResolvedValue(row);
    mocks.claimPregen.mockResolvedValueOnce(false);
    expect(await prepareReport(db, "test-id", env)).toBe("skipped");
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
