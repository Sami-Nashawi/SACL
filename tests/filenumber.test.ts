import { describe, expect, it } from "vitest";
import { normalizeFileNumber, validFileNumber } from "@/lib/password";

describe("company file numbers", () => {
  it("are trimmed and put in capitals", () => { expect(normalizeFileNumber("  cgc-1023 ")).toBe("CGC-1023"); });
  it("accept plain numbers, prefixed numbers and a few separators", () => {
    for (const ok of ["10234", "CGC-1023", "A1", "CGC/55", "EMP.007", "A_B-C", "X".repeat(24)]) expect(validFileNumber(ok), ok).toBe(true);
  });
  it("reject too short, too long, spaces, symbols and email addresses", () => {
    for (const bad of ["", "A", "X".repeat(25), "12 34", "12!", "-12", ".12", "a@b.co", "سامي"]) expect(validFileNumber(bad), bad).toBe(false);
  });
});
