import { describe, expect, it } from "vitest";

import { formatMoney, multiply, parseMoney, percentOf, sum } from "../money.js";

/**
 * The legacy pricing accumulated euros in floats, so totals could land on
 * values like 1234.5600000000002 and a VAT line could disagree with the sum
 * of the lines it was derived from. These tests pin exact-cent behaviour.
 */
describe("money is exact", () => {
  it("parses decimal strings from Postgres numeric", () => {
    expect(parseMoney("123.45")).toBe(12345);
    expect(parseMoney("0.01")).toBe(1);
    expect(parseMoney("1000")).toBe(100000);
    expect(parseMoney("-50.00")).toBe(-5000);
  });

  it("survives the classic float cases", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in floating point.
    expect(sum([parseMoney("0.10"), parseMoney("0.20")])).toBe(30);
    expect(formatMoney(sum([parseMoney("0.10"), parseMoney("0.20")]))).toBe("0.30");
  });

  it("round-trips through formatting without drift", () => {
    for (const value of ["0.00", "0.05", "19.99", "1234.56", "99999.99"]) {
      expect(formatMoney(parseMoney(value))).toBe(value);
    }
  });

  it("computes German VAT exactly", () => {
    const net = parseMoney("1000.00");
    expect(formatMoney(percentOf(net, 19))).toBe("190.00");
    expect(formatMoney(net + percentOf(net, 19))).toBe("1190.00");
  });

  it("rounds half away from zero, as invoices do", () => {
    // 0.125 EUR rounds up to 0.13, not down via banker's rounding.
    expect(formatMoney(percentOf(parseMoney("2.50"), 5))).toBe("0.13");
  });

  it("refuses fractional cents rather than silently truncating", () => {
    expect(() => formatMoney(12.5)).toThrow(/whole cents/);
  });

  it("rejects values that are not numbers", () => {
    expect(() => parseMoney("12,34")).toThrow(/valid monetary value/);
    expect(() => parseMoney("abc")).toThrow(/valid monetary value/);
  });

  it("multiplies by quantity exactly", () => {
    expect(formatMoney(multiply(parseMoney("19.99"), 3))).toBe("59.97");
    expect(formatMoney(multiply(parseMoney("0.01"), 1000))).toBe("10.00");
  });
});
