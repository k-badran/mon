"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { useLiveAvailability } from "@/lib/live/useLiveData";

/**
 * The calculator's input primitives.
 *
 * Every step is built from these rather than from raw inputs, so a change to
 * how a choice looks or announces itself happens once.
 *
 * Styled with Tailwind utilities against the M.io theme, so `bg-brand-red`,
 * `rounded-lg` and `text-body-sm` are the handbook's values rather than
 * Tailwind's defaults.
 */

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

/**
 * A single-select group, drawn as cards.
 *
 * Radio inputs rather than buttons: arrow keys move within the group, it has
 * one tab stop, and the browser announces "2 of 3". A row of buttons with
 * `aria-pressed` gets none of that for free. The input itself is visually
 * hidden but still focusable, and the card reacts through `peer-*`.
 */
export function ChoiceCards<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  columns = 3,
}: {
  name: string;
  legend: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <fieldset
      className="grid gap-3 border-0 p-0 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
      style={{ "--cols": columns } as CSSProperties}
    >
      <legend className="sr-only">{legend}</legend>

      {options.map((option) => (
        <label
          key={option.value}
          className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-border-subtle bg-surface-card p-5 transition-colors hover:border-border-strong has-[:checked]:border-brand-red has-[:checked]:bg-red-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="absolute size-px overflow-hidden opacity-0"
          />

          {option.icon && (
            <span className="text-brand-red" aria-hidden="true">
              {option.icon}
            </span>
          )}

          <span className="text-h6 font-semibold text-text-strong">{option.label}</span>

          {option.hint && (
            <span className="text-body-sm text-text-muted">{option.hint}</span>
          )}
        </label>
      ))}
    </fieldset>
  );
}

/** A labelled field with optional help and error text. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body-sm font-semibold text-text-strong">
        {label}
      </label>

      {hint && (
        <p id={`${id}-hint`} className="text-caption text-text-muted">
          {hint}
        </p>
      )}

      {children}

      {/**
       * Reserved rather than conditionally rendered: an error appearing would
       * otherwise push everything below it down by a line.
       */}
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="min-h-4 text-caption text-danger-text"
      >
        {error ?? ""}
      </p>
    </div>
  );
}

/** The shared input styling, applied to whatever control a step renders. */
export const inputClass =
  "w-full rounded-md border border-border-default bg-surface-card px-4 py-2.5 text-body " +
  "text-text-strong placeholder:text-text-faint " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

/**
 * An on/off option with a description.
 *
 * A checkbox rather than a switch: these are answers submitted with the rest
 * of the form, not settings that take effect the moment they are flipped.
 */
export function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  price,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  price?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-4 rounded-lg border border-border-subtle bg-surface-card p-5 transition-colors hover:border-border-strong has-[:checked]:border-brand-red has-[:checked]:bg-red-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand-red"
      />

      <span className="flex flex-1 flex-col gap-1">
        <span className="text-h6 font-semibold text-text-strong">{label}</span>
        {description && (
          <span className="text-body-sm text-text-muted">{description}</span>
        )}
      </span>

      {price && (
        <span className="text-body-sm font-semibold whitespace-nowrap text-text-strong">
          {price}
        </span>
      )}
    </label>
  );
}

/**
 * A quantity stepper.
 *
 * The number input stays the source of truth so it can be typed into and read
 * by assistive technology; the buttons are conveniences around it.
 */
export function Stepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const button =
    "grid size-9 shrink-0 place-items-center rounded-md border border-border-default " +
    "bg-surface-card text-h5 leading-none text-text-strong transition-colors " +
    "hover:border-brand-red hover:text-brand-red " +
    "disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-faint " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`${label} −1`}
        className={button}
      >
        −
      </button>

      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(event) => onChange(clamp(Number.parseInt(event.target.value, 10) || 0))}
        className="w-14 rounded-md border border-border-default bg-surface-card py-2 text-center text-body font-semibold text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`${label} +1`}
        className={button}
      >
        +
      </button>
    </div>
  );
}

/**
 * A floor picker: which storey, plus whether there is a lift.
 *
 * A select rather than a stepper, because the design draws it as one and
 * because twenty taps to reach the twentieth floor is not a control.
 */
export function FloorField({
  idPrefix,
  label,
  floor,
  hasElevator,
  onFloorChange,
  onElevatorChange,
  elevatorLabel,
  floorOptions,
}: {
  idPrefix: string;
  label: string;
  floor: number;
  hasElevator: boolean;
  onFloorChange: (floor: number) => void;
  onElevatorChange: (hasElevator: boolean) => void;
  elevatorLabel: string;
  floorOptions: Array<{ value: number; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-floor`}
          className="text-caption font-semibold text-text-default"
        >
          {label}
        </label>

        <select
          id={`${idPrefix}-floor`}
          className={selectClass}
          style={selectChevron}
          value={floor}
          onChange={(event) => onFloorChange(Number(event.target.value))}
        >
          {floorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* A lift only changes the price when there are stairs to avoid. */}
      {floor > 0 && (
        <label
          htmlFor={`${idPrefix}-lift`}
          className="group flex w-fit cursor-pointer items-center gap-2"
        >
          <input
            id={`${idPrefix}-lift`}
            type="checkbox"
            checked={hasElevator}
            onChange={(event) => onElevatorChange(event.target.checked)}
            className="peer sr-only"
          />

          {/* The design fills the box green and inks the label once it is on. */}
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-[4px] border border-border-default bg-surface-card text-text-on-brand transition-colors [&>svg]:opacity-0 peer-checked:border-success peer-checked:bg-success peer-checked:[&>svg]:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-yellow"
          >
            <CalcIcon name="check" size={14} />
          </span>

          <span className="text-body-sm text-text-default peer-checked:font-semibold peer-checked:text-text-strong">
            {elevatorLabel}
          </span>
        </label>
      )}
    </div>
  );
}

const CHEVRON =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E";

/** Select styling: the shared input, plus room for the chevron the design draws. */
export const selectClass = `${inputClass} appearance-none bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat pe-10 bg-[image:var(--calc-chevron)]`;

/** Handed to a select as an inline style so the data URI stays out of a class. */
export const selectChevron = { "--calc-chevron": `url("${CHEVRON}")` } as CSSProperties;

/**
 * The line icons the calculator screens draw.
 *
 * Inline rather than an icon package: a dozen glyphs do not justify a
 * dependency, and `currentColor` lets the card that owns one decide whether it
 * is red.
 */
export function CalcIcon({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string | undefined;
}) {
  const paths: Record<string, string[]> = {
    truck: [
      "M10 17h4V5H2v12h3",
      "M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1",
      "M7.5 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0",
      "M15.5 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0",
    ],
    trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"],
    sparkles: [
      "M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5 10.1 7.6z",
      "M19 15l.8 2L22 17.8l-2.2.8L19 21l-.8-2.4L16 17.8l2.2-.8z",
    ],
    "map-pin": [
      "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0",
      "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
    ],
    check: ["m5 13 4 4L19 7"],
    alert: ["M12 3 2 20h20L12 3Z", "M12 9v5", "M12 17h.01"],
    upload: ["M12 16V4", "m7 9 5-5 5 5", "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"],
    x: ["M6 6l12 12", "M18 6 6 18"],
    chevronLeft: ["m15 5-7 7 7 7"],
    chevronRight: ["m9 5 7 7-7 7"],
    calendar: ["M4 6h16v15H4z", "M8 3v5", "M16 3v5", "M4 11h16"],
    dot: ["M12 12h.01"],
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      {(paths[name] ?? paths["dot"] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The service cards on the first screen: a 48px medallion, a name, one line.
 *
 * Radios, not checkboxes. The design ticks two services at once and calls it a
 * "combined package deal", but `serviceType` is a single value from the request
 * schema through the pricing engine to the orders table, so a combined package
 * has no price behind it. A tick the quote then ignores is worse than asking
 * for one service and letting the customer call about the rest.
 */
export function ServiceCards<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T;
  options: Array<{ value: T; label: string; description: string; icon: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="grid gap-4 border-0 p-0">
      <legend className="sr-only">{legend}</legend>

      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-5 rounded-xl border-2 border-transparent bg-surface-card p-6 transition-colors hover:border-border-default has-[:checked]:border-brand-yellow has-[:checked]:bg-yellow-tint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />

          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-[4px] border border-border-default bg-surface-card text-text-on-brand [&>svg]:opacity-0 peer-checked:border-brand-red peer-checked:bg-brand-red peer-checked:[&>svg]:opacity-100"
          >
            <CalcIcon name="check" size={16} />
          </span>

          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-50 text-brand-red"
          >
            <CalcIcon name={option.icon} />
          </span>

          <span className="flex flex-1 flex-col gap-1">
            <span className="text-h6 font-bold text-text-strong">{option.label}</span>
            <span className="text-body-sm text-text-default">{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A row of radios with a visible dot, as the route screen draws customer type. */
export function InlineRadios<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-6 border-0 p-0">
      <legend className="sr-only">{legend}</legend>

      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />

          <span
            aria-hidden="true"
            className="grid size-[18px] shrink-0 place-items-center rounded-full border border-border-default bg-surface-card transition-colors [&>span]:opacity-0 peer-checked:border-brand-red peer-checked:bg-brand-red peer-checked:[&>span]:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-yellow"
          >
            <span className="size-1.5 rounded-full bg-neutral-0" />
          </span>

          <span className="text-body text-text-default peer-checked:font-semibold peer-checked:text-text-strong">
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Stacked radio cards with a title and a sub-line — the arrival windows. */
export function RadioList<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T;
  options: Array<{ value: T; label: string; hint: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="grid gap-3 border-0 p-0">
      <legend className="sr-only">{legend}</legend>

      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 transition-colors hover:border-border-strong has-[:checked]:border-brand-red has-[:checked]:bg-red-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />

          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded-full border border-border-default bg-surface-card transition-colors [&>span]:opacity-0 peer-checked:border-brand-red peer-checked:bg-brand-red peer-checked:[&>span]:opacity-100"
          >
            <span className="size-1.5 rounded-full bg-neutral-0" />
          </span>

          <span className="flex flex-col gap-0.5">
            <span className="text-body font-bold text-text-strong">{option.label}</span>
            <span className="text-caption text-text-default">{option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** The two-tab switch over the volume step's two modes. */
export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={legend}
      className="inline-flex rounded-md bg-surface-card p-1"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-[6px] px-8 py-1.5 text-body-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow",
              active
                ? "bg-brand-red font-bold text-text-on-brand"
                : "font-semibold text-text-default hover:text-text-strong",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A slider with its range spelled out underneath, as the area step draws it. */
export function RangeSlider({
  id,
  label,
  value,
  min,
  max,
  onChange,
  minLabel,
  maxLabel,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-semibold text-text-default">
        {label}
      </label>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer rounded-full accent-brand-red focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow"
      />

      <div className="flex justify-between text-caption text-text-faint">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/** The room filter above the itemised list. One chip is active at a time. */
export function Chips<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={legend} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-4 py-2 text-body-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow",
              active
                ? "bg-brand-yellow font-bold text-text-strong"
                : "bg-surface-card font-medium text-text-default hover:text-text-strong",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A callout: an icon badge, a heading, and the sentence that explains it. */
export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning";
  title: string;
  children: ReactNode;
}) {
  const skin =
    tone === "warning"
      ? "border-warning bg-warning-soft"
      : "border-brand-yellow bg-yellow-tint";

  return (
    <div className={`flex items-start gap-4 rounded-xl border p-5 ${skin}`}>
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-yellow text-text-strong"
      >
        <CalcIcon name="alert" size={14} />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-body-sm font-bold text-text-strong">{title}</p>
        <div className="text-body-sm text-text-default">{children}</div>
      </div>
    </div>
  );
}

export interface CalendarLabels {
  prev: string;
  next: string;
  loading: string;
  free: string;
  limited: string;
  full: string;
  selected: string;
}

/**
 * The month calendar on the date step.
 *
 * It renders `GET /api/availability`, which classifies every day of a month
 * against the real booking rules — lead time, the closed weekday, holidays,
 * the horizon, and the capacity a second van consumes. That endpoint and its
 * hook were written with the API and nothing called them until now.
 *
 * Advisory only: capacity is re-checked under a row lock when the order is
 * placed, so a day that looks free here can still come back SLOT_TAKEN.
 */
export function AvailabilityCalendar({
  value,
  onChange,
  capacity,
  locale,
  labels,
}: {
  value: string;
  onChange: (day: string) => void;
  capacity: number;
  locale: string;
  labels: CalendarLabels;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
  });

  const { data, isLoading } = useLiveAvailability(cursor.year, cursor.month, capacity);

  const byDate = useMemo(() => {
    const map = new Map<string, { status: string; remainingCapacity: number }>();
    for (const day of data?.days ?? []) map.set(String(day.date), day);
    return map;
  }, [data]);

  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    // 1 January 2024 was a Monday, and the grid starts on Monday.
    return Array.from({ length: 7 }, (_, index) =>
      format.format(new Date(Date.UTC(2024, 0, 1 + index))),
    );
  }, [locale]);

  const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);

  // Monday-first, so Sunday (0) becomes the last column.
  const leading = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();

  const shift = (by: number) =>
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month - 1 + by, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });

  const navButton =
    "grid size-8 place-items-center rounded-md text-text-strong transition-colors " +
    "hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-h6 font-bold text-text-strong">{monthLabel}</p>

        <div className="flex gap-1">
          <button
            type="button"
            className={navButton}
            onClick={() => shift(-1)}
            aria-label={labels.prev}
          >
            <CalcIcon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            className={navButton}
            onClick={() => shift(1)}
            aria-label={labels.next}
          >
            <CalcIcon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-busy={isLoading}>
        {weekdays.map((day) => (
          <span key={day} className="py-1 text-center text-caption font-bold text-text-faint">
            {day}
          </span>
        ))}

        {Array.from({ length: leading }, (_, index) => (
          <span key={`lead-${index}`} aria-hidden="true" />
        ))}

        {Array.from({ length }, (_, index) => {
          const day = index + 1;
          const iso = `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry = byDate.get(iso);
          const bookable = entry?.status === "free";
          const scarce = bookable && (entry?.remainingCapacity ?? 0) <= 1;
          const chosen = iso === value;

          return (
            <button
              key={iso}
              type="button"
              disabled={!bookable}
              aria-pressed={chosen}
              onClick={() => onChange(iso)}
              className={[
                "relative grid aspect-square place-items-center rounded-md text-body-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow",
                chosen
                  ? "bg-brand-red font-bold text-text-on-brand"
                  : bookable
                    ? "text-text-strong hover:bg-surface-sunken"
                    : "cursor-not-allowed text-text-faint",
              ].join(" ")}
            >
              {day}

              {bookable && !chosen && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 size-1 rounded-full ${
                    scarce ? "bg-brand-yellow" : "bg-success"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border-subtle pt-4 text-caption text-text-default">
        {[
          { key: "free", dot: "bg-success", text: labels.free },
          { key: "limited", dot: "bg-brand-yellow", text: labels.limited },
          { key: "full", dot: "bg-border-strong", text: labels.full },
          { key: "selected", dot: "bg-brand-red", text: labels.selected },
        ].map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-2 rounded-full ${item.dot}`} />
            {item.text}
          </li>
        ))}
      </ul>

      {isLoading && (
        <p role="status" className="text-caption text-text-muted">
          {labels.loading}
        </p>
      )}
    </div>
  );
}
