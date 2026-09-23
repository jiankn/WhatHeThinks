import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { buildUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { genChat } from "./synth";

const mocks = vi.hoisted(() => ({ write: vi.fn(), getReportRow: vi.fn(), getEvidence: vi.fn(), getAnalysis: vi.fn(), saveReport: vi.fn(), setStatus: vi.fn(), recordEvent: vi.fn() }));
vi.mock("@/lib/server/deepseek-writer", () => ({ DeepSeekReportWriter: class { name = "llm"; write = mocks.write; } }));
vi.mock("@/lib/server/reports", () => mocks);
import { generateReport } from "@/lib/server/generate";

beforeEach(() => vi.clearAllMocks());

describe("Report fulfillment fails closed", () => {
  const db = {} as D1Database;
  const env = { DEEPSEEK_API_KEY: "test-key", DEEPSEEK_MODEL: "deepseek-flash" } as CloudflareEnv;

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
