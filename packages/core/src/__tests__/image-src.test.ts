import { describe, expect, it } from "vitest";

import { isSafeImageSrc } from "../image-src.js";

describe("isSafeImageSrc", () => {
  it("accepts shipped image paths and https URLs", () => {
    expect(isSafeImageSrc("/images/home/hero-right.jpg")).toBe(true);
    expect(isSafeImageSrc("  /images/logo.svg ")).toBe(true);
    expect(isSafeImageSrc("https://cdn.example.com/a/b.jpg?w=800")).toBe(true);
  });

  it("rejects script and data schemes, http and other origins", () => {
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeImageSrc("java\tscript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageSrc("http://example.com/a.jpg")).toBe(false);
    expect(isSafeImageSrc("//evil.example/a.jpg")).toBe(false);
    expect(isSafeImageSrc("https://user:pw@example.com/a.jpg")).toBe(false);
  });

  it("rejects paths outside /images/", () => {
    expect(isSafeImageSrc("")).toBe(false);
    expect(isSafeImageSrc("/api/admin")).toBe(false);
    expect(isSafeImageSrc("images/a.jpg")).toBe(false);
    expect(isSafeImageSrc("/images/../api/x")).toBe(false);
    expect(isSafeImageSrc("/images/%2e%2e/api")).toBe(false);
    expect(isSafeImageSrc("/images\\..\\x")).toBe(false);
  });
});
