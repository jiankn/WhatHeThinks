import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, safeNextPath, verifyPassword } from "@/lib/server/auth";

describe("account security helpers", () => {
  it("normalizes email addresses and only accepts local redirect paths", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
    expect(safeNextPath("/account?tab=reports")).toBe("/account?tab=reports");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
  });

  it("stores a salted PBKDF2 hash and verifies it without retaining the password", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("incorrect password", hash)).toBe(false);
  }, 15_000);
});
