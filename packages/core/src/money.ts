/**
 * Exact money arithmetic in integer cents.
 *
 * The legacy pricing code accumulated EUR in JavaScript floats, so totals
 * could land on values like 1234.5600000000002 and a VAT figure could disagree
 * with the sum of its own lines. Every amount here is an integer number of
 * cents; conversion to a decimal string happens once, at the edge.
 *
 * All functions are pure, which is what makes the pricing engine testable.
 */

/** A monetary amount in whole cents. Never fractional. */
export type Cents = number;

const CENTS_PER_EURO = 100;

/** Parses a decimal string (as Postgres `numeric` returns) into cents. */
export function parseMoney(value: string | number): Cents {
  const normalized = typeof value === "number" ? value.toString() : value.trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new TypeError(`Not a valid monetary value: "${value}"`);
  }

  const [wholePart = "0", fractionPart = ""] = normalized.split(".");
  const sign = wholePart.startsWith("-") ? -1 : 1;
  const whole = Math.abs(Number.parseInt(wholePart, 10));

  // Pad or truncate to exactly two decimal places, rounding the third.
  const padded = fractionPart.padEnd(3, "0");
  const cents = Number.parseInt(padded.slice(0, 2), 10);
  const thirdDigit = Number.parseInt(padded[2] ?? "0", 10);
  const rounded = thirdDigit >= 5 ? cents + 1 : cents;

  return sign * (whole * CENTS_PER_EURO + rounded);
}

/** Formats cents as a plain decimal string suitable for `numeric` columns. */
export function formatMoney(cents: Cents): string {
  assertInteger(cents);

  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.trunc(absolute / CENTS_PER_EURO);
  const fraction = absolute % CENTS_PER_EURO;

  return `${sign}${whole}.${fraction.toString().padStart(2, "0")}`;
}

/**
 * Applies a percentage and rounds half-up, the convention German invoices use.
 * `percent` is expressed as a human percentage (19 means 19%).
 */
export function percentOf(amount: Cents, percent: number): Cents {
  assertInteger(amount);

  if (!Number.isFinite(percent)) {
    throw new TypeError(`Percentage must be finite, received ${percent}`);
  }

  return roundHalfUp((amount * percent) / 100);
}

/** Multiplies by a quantity, keeping the result an exact number of cents. */
export function multiply(amount: Cents, factor: number): Cents {
  assertInteger(amount);

  if (!Number.isFinite(factor)) {
    throw new TypeError(`Factor must be finite, received ${factor}`);
  }

  return roundHalfUp(amount * factor);
}

export function sum(amounts: readonly Cents[]): Cents {
  return amounts.reduce<Cents>((total, amount) => {
    assertInteger(amount);
    return total + amount;
  }, 0);
}

/** Clamps to zero. A discount must never produce a negative invoice. */
export function atLeastZero(amount: Cents): Cents {
  return Math.max(0, amount);
}

/** Returns whichever amount is larger — used for the minimum order value. */
export function atLeast(amount: Cents, floor: Cents): Cents {
  return Math.max(amount, floor);
}

/**
 * Rounds half away from zero, matching how invoices round in Germany.
 * `Math.round` rounds -0.5 to -0, which would be wrong for refunds.
 */
function roundHalfUp(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

function assertInteger(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new TypeError(
      `Monetary amounts must be whole cents, received ${amount}. ` +
        "Use parseMoney() to convert a decimal value.",
    );
  }
}
