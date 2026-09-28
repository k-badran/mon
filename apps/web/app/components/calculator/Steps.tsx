"use client";

import { useEffect, useMemo, useState, type DragEvent, type Dispatch, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useCatalog } from "@/lib/live/useLiveData";
import {
  activeSteps,
  type CalculatorAction,
  type CalculatorState,
  type StepId,
} from "@/lib/calculator/machine";
import {
  AvailabilityCalendar,
  CalcIcon,
  Chips,
  Field,
  FloorField,
  InlineRadios,
  inputClass,
  Notice,
  RadioList,
  RangeSlider,
  Segmented,
  ServiceCards,
  Stepper,
  ToggleRow,
} from "./Controls";

/**
 * One component per step of the calculator.
 *
 * Each receives the whole state and the dispatcher rather than a bespoke set of
 * props, because several steps read answers they do not own — the route step
 * needs the service type to know whether to ask for a destination.
 *
 * The steps follow the design's ten screens, which is not the same as ten
 * questions: customer type and the two addresses share one screen, the two
 * volume screens are one step in two modes, and the last screen asks nothing
 * and only reads the answers back.
 */

interface StepProps {
  state: CalculatorState;
  dispatch: Dispatch<CalculatorAction>;
}

const set = (dispatch: Dispatch<CalculatorAction>, patch: Partial<CalculatorState>) =>
  dispatch({ type: "set", patch });

const note = "text-body-sm text-text-muted";
const card = "rounded-lg border border-border-subtle bg-surface-card";
const fieldLabel = "text-caption font-semibold text-text-default";

/** The arrival windows the date screen offers, keyed by their start time. */
const ARRIVAL_WINDOWS = ["08:00", "12:00", "17:00"] as const;
type ArrivalWindow = (typeof ARRIVAL_WINDOWS)[number];

const WINDOW_KEY: Record<ArrivalWindow, string> = {
  "08:00": "morning",
  "12:00": "afternoon",
  "17:00": "evening",
};

function ServiceStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();

  return (
    <ServiceCards
      name="serviceType"
      legend={t("calc.step.service")}
      value={state.serviceType}
      onChange={(serviceType) => set(dispatch, { serviceType })}
      options={[
        {
          value: "moving",
          label: t("calc.service.movingName"),
          description: t("calc.service.movingHint"),
          icon: "truck",
        },
        {
          value: "disposal",
          label: t("calc.service.disposalName"),
          description: t("calc.service.disposalHint"),
          icon: "trash",
        },
        {
          value: "cleaning",
          label: t("calc.service.cleaningName"),
          description: t("calc.service.cleaningHint"),
          icon: "sparkles",
        },
      ]}
    />
  );
}

/** An address input with the design's leading pin. */
function AddressField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>

      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-3 text-text-default"
        >
          <CalcIcon name="map-pin" size={16} />
        </span>

        <input
          id={id}
          type="text"
          autoComplete="street-address"
          className={`${inputClass} ps-9`}
          value={value}
          placeholder={placeholder}
          {...(hint ? { "aria-describedby": `${id}-hint` } : {})}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Customer type and both addresses — one screen in the design, so one step.
 *
 * The design also draws a route map with the distance on it. Distance is
 * geocoded on the server and arrives with the quote, so the map has no data
 * behind it here and is left out rather than drawn with a made-up line.
 */
function RouteStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();
  const needsDestination = state.serviceType === "moving";

  return (
    <div className="grid gap-6">
      <InlineRadios
        name="customerType"
        legend={t("calc.customerType")}
        value={state.customerType}
        onChange={(customerType) => set(dispatch, { customerType })}
        options={[
          { value: "private", label: t("calc.customer.private") },
          { value: "business", label: t("calc.customer.business") },
        ]}
      />

      <div className="grid gap-4">
        <AddressField
          id="origin"
          label={t("calc.fromAddress")}
          value={state.originAddress}
          placeholder={t("calc.addressPlaceholder")}
          hint={t("calc.addressHint")}
          onChange={(originAddress) => set(dispatch, { originAddress })}
        />

        {needsDestination ? (
          <AddressField
            id="destination"
            label={t("calc.toAddress")}
            value={state.destinationAddress}
            placeholder={t("calc.addressPlaceholder")}
            onChange={(destinationAddress) => set(dispatch, { destinationAddress })}
          />
        ) : null}
      </div>

      {/* The distance surcharge is computed from these on the server; saying so
          here is what stops "why did the price change?" after the quote. */}
      <p className={note}>{t("calc.distanceNote")}</p>
    </div>
  );
}

/** "Heidestraße 14, 10557 Berlin" → "Heidestraße", as the design titles it. */
function placeOf(address: string, fallback: string): string {
  const street = address.split(",")[0]?.trim() ?? "";
  if (!street) return fallback;

  // Drop a trailing house number: the design shows the street alone.
  return street.replace(/\s+\d+\s*[a-zA-Z]?$/, "");
}

function PropertyCard({
  badge,
  tone,
  title,
  children,
}: {
  badge: string;
  tone: "origin" | "destination";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`${card} flex flex-col gap-5 p-5`}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-text-on-brand ${
            tone === "origin" ? "bg-brand-red" : "bg-success"
          }`}
        >
          {badge}
        </span>

        <p className="text-body leading-[19px] font-bold text-text-heading">{title}</p>
      </div>

      {children}
    </div>
  );
}

/**
 * Floors and lifts, one card per end of the move.
 *
 * The design also asks for property type, how far the truck can park and free
 * access notes. None of the three exists in `QuoteInput`, the request schema or
 * the orders table, so asking for them would collect answers that never reach a
 * quote or a crew. They are left out until the model carries them.
 */
function PropertyStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();

  const floorOptions = useMemo(
    () => [
      { value: 0, label: t("orders.groundFloor") },
      ...Array.from({ length: 20 }, (_, index) => ({
        value: index + 1,
        label: t("calc.floorNth", { values: { n: index + 1 } }),
      })),
    ],
    [t],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <PropertyCard
        badge="A"
        tone="origin"
        title={t("calc.propertyFrom", {
          values: { place: placeOf(state.originAddress, t("calc.fromAddress")) },
        })}
      >
        <FloorField
          idPrefix="origin"
          label={t("calc.floor")}
          floor={state.originFloor}
          hasElevator={state.originHasElevator}
          onFloorChange={(originFloor) => set(dispatch, { originFloor })}
          onElevatorChange={(originHasElevator) => set(dispatch, { originHasElevator })}
          elevatorLabel={t("calc.hasElevator")}
          floorOptions={floorOptions}
        />
      </PropertyCard>

      {state.serviceType === "moving" ? (
        <PropertyCard
          badge="B"
          tone="destination"
          title={t("calc.propertyTo", {
            values: { place: placeOf(state.destinationAddress, t("calc.toAddress")) },
          })}
        >
          <FloorField
            idPrefix="destination"
            label={t("calc.floor")}
            floor={state.destinationFloor}
            hasElevator={state.destinationHasElevator}
            onFloorChange={(destinationFloor) => set(dispatch, { destinationFloor })}
            onElevatorChange={(destinationHasElevator) =>
              set(dispatch, { destinationHasElevator })
            }
            elevatorLabel={t("calc.hasElevator")}
            floorOptions={floorOptions}
          />
        </PropertyCard>
      ) : null}
    </div>
  );
}

const AREA_MIN = 10;
const AREA_MAX = 200;

/**
 * Volume, by floor area or item by item.
 *
 * One step with a switch, which is how the design draws it: both screens carry
 * the same heading and the same highlighted rail node.
 *
 * The design also prints an estimated cargo volume in m³. Turning m² into m³ is
 * a pricing assumption and turning items into m³ needs `volumeM3`, which the
 * public catalog endpoint does not return. Either way the number would be a
 * browser-side guess at something the server owns, so it is not shown.
 */
function VolumeStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();
  const kind = state.serviceType === "cleaning" ? "cleaning" : "furniture";
  const { data, isLoading } = useCatalog(kind);

  // A view filter, not an answer — it belongs to the screen, not to the quote.
  const [room, setRoom] = useState("all");

  const items = useMemo(() => data?.items ?? [], [data]);

  const rooms = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) if (!seen.includes(item.category)) seen.push(item.category);
    return seen;
  }, [items]);

  const shown = room === "all" ? items : items.filter((item) => item.category === room);

  const total = shown.reduce((sum, item) => sum + (state.selectedItems[item.id] ?? 0), 0);

  const area = Number.parseFloat(state.areaSqm);
  const sliderValue = Number.isFinite(area)
    ? Math.min(AREA_MAX, Math.max(AREA_MIN, area))
    : AREA_MIN;

  return (
    <div className="grid gap-6">
      <Segmented
        legend={t("calc.method")}
        value={state.calculationMethod}
        onChange={(calculationMethod) => set(dispatch, { calculationMethod })}
        options={[
          { value: "area", label: t("calc.methodArea") },
          { value: "items", label: t("calc.methodItems") },
        ]}
      />

      {state.calculationMethod === "area" ? (
        <div className={`${card} grid gap-6 p-6`}>
          <Field id="area" label={t("calc.livingArea")} hint={t("calc.areaHint")}>
            <input
              id="area"
              type="number"
              inputMode="decimal"
              min={1}
              max={2000}
              className={inputClass}
              value={state.areaSqm}
              onChange={(event) => set(dispatch, { areaSqm: event.target.value })}
            />
          </Field>

          <RangeSlider
            id="area-slider"
            label={t("calc.adjustArea")}
            value={sliderValue}
            min={AREA_MIN}
            max={AREA_MAX}
            onChange={(next) => set(dispatch, { areaSqm: String(next) })}
            minLabel={t("calc.sqmValue", { values: { n: AREA_MIN } })}
            maxLabel={t("calc.sqmValue", { values: { n: AREA_MAX } })}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {rooms.length > 0 ? (
            <Chips
              legend={t("calc.roomFilter")}
              value={room}
              onChange={setRoom}
              options={[
                { value: "all", label: t("calc.roomAll") },
                ...rooms.map((name) => ({ value: name, label: name })),
              ]}
            />
          ) : null}

          {isLoading ? <p className={note}>{t("common.loading")}</p> : null}

          {/* One 52px row per item inside a 20px-padded card (3:1174). */}
          <div className={`${card} divide-y divide-border-subtle px-5 py-2`}>
            {shown.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-body-sm leading-[17px] font-medium text-text-heading">
                  {item.name}
                </span>

                <Stepper
                  id={`item-${item.id}`}
                  label={item.name}
                  value={state.selectedItems[item.id] ?? 0}
                  onChange={(quantity) =>
                    dispatch({
                      type: "setItemQuantity",
                      bucket: "selectedItems",
                      itemId: item.id,
                      quantity,
                    })
                  }
                />
              </div>
            ))}
          </div>

          <p className="text-body-sm font-semibold text-text-default" aria-live="polite">
            {room === "all"
              ? t("calc.totalItemsAll", { values: { count: total } })
              : t("calc.totalRoomItems", { values: { room, count: total } })}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The extras the engine prices.
 *
 * The design offers six cards, each with its own price. Three of the six are
 * not extras the engine knows: assembly is asked per item two steps later, and
 * cleaning and clearance are separate services rather than add-ons to a move.
 * The per-card prices come from the rate card, which the API deliberately never
 * sends to a browser, so the total moves instead of the card.
 */
function AddonsStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4">
      <ToggleRow
        id="packing"
        label={t("calc.packing")}
        description={t("calc.packingHint")}
        checked={state.packingService}
        onChange={(packingService) => set(dispatch, { packingService })}
      />
      <ToggleRow
        id="parking"
        label={t("calc.parkingZone")}
        description={t("calc.parkingZoneHint")}
        checked={state.parkingZone}
        onChange={(parkingZone) => set(dispatch, { parkingZone })}
      />
      <ToggleRow
        id="insurance"
        label={t("calc.insurance")}
        description={t("calc.insuranceHint")}
        checked={state.transportInsurance}
        onChange={(transportInsurance) => set(dispatch, { transportInsurance })}
      />

      <p className={note}>{t("calc.addonsNote")}</p>
    </div>
  );
}

/**
 * Crew and vehicles.
 *
 * The design offers a free worker count (drawn at four) and three vehicle
 * tiers. `crewSize` is `2 | 3` and the vehicle is a second van or not, in the
 * request schema, the pricing engine and the database alike. A stepper that
 * reaches four would quote three, so the design's stepper (3:1580) is kept
 * and bounded to the two real answers.
 */
function WorkersStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-8">
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div className="flex max-w-[376px] flex-col gap-1">
          <label
            htmlFor="crew-size"
            className="font-display text-h5 leading-[23px] font-bold text-text-heading"
          >
            {t("calc.crewSize")}
          </label>
          <p className="text-[13px] leading-[17px] text-text-default">
            {t("calc.crewRecommendation")}
          </p>
        </div>

        <Stepper
          id="crew-size"
          label={t("calc.crewSize")}
          variant="pill"
          min={2}
          max={3}
          value={state.crewSize}
          onChange={(crewSize) => set(dispatch, { crewSize: crewSize === 3 ? 3 : 2 })}
        />
      </div>

      <ToggleRow
        id="second-van"
        label={t("calc.secondVan")}
        description={t("calc.secondVanHint")}
        checked={state.secondVan}
        onChange={(secondVan) => set(dispatch, { secondVan })}
      />
    </div>
  );
}

/**
 * Items that need taking apart and rebuilding.
 *
 * The design's version of this screen counts pianos, safes and aquariums. The
 * engine has no surcharge for any of them and nothing sends such a job to
 * review, so those counters would take an answer and quote as if it had not
 * been given. This asks the handling question the engine does price.
 */
function SpecialStep({ state, dispatch }: StepProps) {
  const { t } = useI18n();
  const { data, isLoading } = useCatalog("furniture");

  // Only items the customer is actually moving can be assembled or taken apart.
  const chosen = (data?.items ?? []).filter(
    (item) => state.calculationMethod === "area" || state.selectedItems[item.id],
  );

  return (
    <div className="grid gap-6">
      <Notice title={t("calc.specialNoticeTitle")}>{t("calc.specialNoticeBody")}</Notice>

      <p className={note}>{t("calc.specialHint")}</p>

      {isLoading ? <p className={note}>{t("common.loading")}</p> : null}

      {!isLoading && chosen.length === 0 ? (
        <p className={note}>{t("calc.specialEmpty")}</p>
      ) : null}

      {/* Two columns of item cards, ringed in red once anything is counted (3:1729). */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-x-8">
      {chosen.map((item) => {
        const counted =
          (state.assemblyItems[item.id] ?? 0) + (state.disassemblyItems[item.id] ?? 0) > 0;

        return (
        <div
          key={item.id}
          className={`${card} flex flex-col gap-3 p-4 ${
            counted ? "border-brand-red shadow-[inset_0_0_0_0.5px_var(--color-brand-red)]" : ""
          }`}
        >
          <span className="font-display text-body-sm leading-[18px] font-bold text-text-heading">
            {item.name}
          </span>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <span className="mb-1 block text-[11px] leading-[14px] text-text-default">
                {t("calc.assembly")}
              </span>
              <Stepper
                id={`assembly-${item.id}`}
                label={`${t("calc.assembly")}: ${item.name}`}
                variant="pill"
                value={state.assemblyItems[item.id] ?? 0}
                onChange={(quantity) =>
                  dispatch({
                    type: "setItemQuantity",
                    bucket: "assemblyItems",
                    itemId: item.id,
                    quantity,
                  })
                }
              />
            </div>

            <div>
              <span className="mb-1 block text-[11px] leading-[14px] text-text-default">
                {t("calc.disassembly")}
              </span>
              <Stepper
                id={`disassembly-${item.id}`}
                label={`${t("calc.disassembly")}: ${item.name}`}
                variant="pill"
                value={state.disassemblyItems[item.id] ?? 0}
                onChange={(quantity) =>
                  dispatch({
                    type: "setItemQuantity",
                    bucket: "disassemblyItems",
                    itemId: item.id,
                    quantity,
                  })
                }
              />
            </div>
          </div>
        </div>
        );
      })}
      </div>
    </div>
  );
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Photos of the job.
 *
 * The design draws upload progress bars and a per-file "Uploading…" state.
 * There is no upload endpoint and no storage behind one, so the files stay in
 * the browser and the screen says so. A progress bar for a request that is
 * never made is the one thing this screen must not do.
 */
function PhotosStep({ state, dispatch }: StepProps) {
  const { t, locale } = useI18n();

  // Files cannot be serialised, so a refresh keeps the names and loses the
  // sizes. The list renders from the names either way.
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const megabytes = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  function accept(incoming: FileList | null) {
    const chosen = Array.from(incoming ?? []);
    const kept = chosen.filter((file) => file.size <= MAX_PHOTO_BYTES);

    setRejected(
      chosen.filter((file) => file.size > MAX_PHOTO_BYTES).map((file) => file.name),
    );

    const next = [...files, ...kept];
    setFiles(next);

    const names = state.photoNames.slice();
    for (const file of kept) if (!names.includes(file.name)) names.push(file.name);
    set(dispatch, { photoNames: names });
  }

  function remove(name: string) {
    setFiles(files.filter((file) => file.name !== name));
    set(dispatch, { photoNames: state.photoNames.filter((entry) => entry !== name) });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files);
  }

  return (
    <div className="grid gap-6">
      <p className={note}>{t("calc.photosHint")}</p>

      {/* The drop zone of 3:1930: a dashed 1.5px red outline around a red-tinted medallion. */}
      <label
        htmlFor="photos"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-lg border-[1.5px] border-dashed border-brand-red px-6 py-10 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow ${
          dragging ? "bg-red-50" : "bg-surface-card"
        }`}
      >
        <input
          id="photos"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="sr-only"
          onChange={(event) => accept(event.target.files)}
        />

        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-full bg-brand-red/6 text-brand-red"
        >
          <CalcIcon name="upload" size={24} />
        </span>

        <span className="flex flex-col gap-1">
          <span className="font-display text-body leading-5 font-bold text-text-heading">
            {t("calc.photosDropTitle")}
          </span>
          <span className="text-[13px] leading-[17px] text-text-default">
            {t("calc.photosDropHint")}
          </span>
        </span>

        <span className="rounded-[6px] bg-brand-red px-4 py-2 text-[13px] leading-[17px] font-semibold text-text-on-brand">
          {t("calc.photosChoose")}
        </span>
      </label>

      <div aria-live="polite">
        {rejected.length > 0 ? (
          <p className="rounded-md border border-danger bg-danger-soft px-4 py-3 text-body-sm text-danger-text">
            {t("calc.photosTooLarge", { values: { names: rejected.join(", ") } })}
          </p>
        ) : null}
      </div>

      {state.photoNames.length > 0 ? (
        <div className="grid gap-3">
          <p className="font-display text-body leading-5 font-bold text-text-heading">
            {t("calc.photosListTitle")}
          </p>

          {/* One card per file with its 50px preview (3:1940). */}
          <ul className="grid gap-3">
            {state.photoNames.map((name) => {
              const file = files.find((entry) => entry.name === name);

              return (
                <li
                  key={name}
                  className={`${card} flex items-center justify-between gap-4 rounded-md p-3`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <PhotoThumb file={file} />

                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-body-sm leading-[18px] font-semibold text-text-heading">
                        {name}
                      </span>
                      <span className="text-caption leading-4 tracking-normal text-text-default">
                        {file === undefined
                          ? t("calc.photosPending")
                          : `${megabytes.format(file.size / 1024 / 1024)} MB • ${t("calc.photosPending")}`}
                      </span>
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => remove(name)}
                    aria-label={t("calc.photosRemove", { values: { name } })}
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-page text-text-default transition-colors hover:text-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                  >
                    <CalcIcon name="trash" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/**
       * There is no upload endpoint yet. Saying so is the difference between a
       * customer who brings their photos to the site visit and one who thinks
       * we already have them.
       */}
      <p
        role="status"
        className="rounded-md border border-warning bg-warning-soft px-4 py-3 text-body-sm text-warning-text"
      >
        {t("calc.photosNotUploaded")}
      </p>

      <div className={`${card} grid gap-3 p-5`}>
        <p className="font-display text-[15px] leading-[19px] font-bold text-text-heading">
          <span aria-hidden="true">💡 </span>
          {t("calc.photosTipsTitle")}
        </p>
        <ul className="grid gap-2 text-[13px] leading-[17px] text-text-default">
          <li>{t("calc.photosTip1")}</li>
          <li>{t("calc.photosTip2")}</li>
          <li>{t("calc.photosTip3")}</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * A local preview of a chosen photo. The file never leaves the browser; the
 * object URL is released when the row goes. After a refresh only the name
 * survives, so the tile is left blank.
 */
function PhotoThumb({ file }: { file: File | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    const next = URL.createObjectURL(file);
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <span className="size-[50px] shrink-0 overflow-hidden rounded-[6px] bg-surface-sunken">
      {file && url ? <img src={url} alt="" className="size-full object-cover" /> : null}
    </span>
  );
}

/**
 * The move date and the arrival window.
 *
 * The calendar is the availability endpoint, not a static month: a day is only
 * clickable when the server says it is free, and the dot says whether it is
 * the last slot. The design's backup date has no field behind it and is left
 * out; the discount code has no screen in the design but does have a field, an
 * engine rule and revenue behind it, so it stays until someone says otherwise.
 */
function DateStep({ state, dispatch }: StepProps) {
  const { t, locale } = useI18n();

  const arrival = (ARRIVAL_WINDOWS.find((entry) => entry === state.scheduledTime) ??
    "08:00") as ArrivalWindow;

  return (
    <div className="grid gap-8">
      <AvailabilityCalendar
        value={state.scheduledDate}
        onChange={(scheduledDate) => set(dispatch, { scheduledDate })}
        // A second van takes a second slot out of the day's capacity.
        capacity={state.secondVan ? 2 : 1}
        locale={locale}
        labels={{
          prev: t("calc.prevMonth"),
          next: t("calc.nextMonth"),
          loading: t("common.loading"),
          free: t("calc.dayFree"),
          limited: t("calc.dayLimited"),
          full: t("calc.dayFull"),
          selected: t("calc.daySelected"),
        }}
      />

      <div className="grid gap-3">
        <p className="font-display text-h5 leading-[23px] font-bold text-text-heading">
          {t("calc.arrivalWindow")}
        </p>

        <RadioList
          name="arrivalWindow"
          legend={t("calc.arrivalWindow")}
          value={arrival}
          onChange={(scheduledTime) => set(dispatch, { scheduledTime })}
          options={ARRIVAL_WINDOWS.map((time) => ({
            value: time,
            label: t(`calc.window.${WINDOW_KEY[time]}`),
            hint: t(`calc.window.${WINDOW_KEY[time]}Hint`),
          }))}
        />
      </div>

      {/* The date is also typed, so a keyboard user is not made to walk a grid. */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="date" label={t("calc.preferredDate")} hint={t("calc.dateHint")}>
          <input
            id="date"
            type="date"
            className={inputClass}
            value={state.scheduledDate}
            onChange={(event) => set(dispatch, { scheduledDate: event.target.value })}
          />
        </Field>

        <Field id="discount" label={t("calc.discountCode")} hint={t("calc.discountHint")}>
          <input
            id="discount"
            type="text"
            className={inputClass}
            value={state.discountCode}
            onChange={(event) => set(dispatch, { discountCode: event.target.value.toUpperCase() })}
          />
        </Field>
      </div>
    </div>
  );
}

/**
 * The tenth step: the answers read back, and nothing asked.
 *
 * It shows no money. The price arrives from the server when the customer asks
 * for it on this screen, and every figure here is one of their own answers.
 */
function ReviewStep({ state }: StepProps) {
  const { t, formatDate } = useI18n();

  const floor = (level: number, lift: boolean) =>
    `${level === 0 ? t("orders.groundFloor") : t("calc.floorNth", { values: { n: level } })}${
      lift ? ` · ${t("calc.hasElevator")}` : ""
    }`;

  const addons = [
    state.packingService ? t("calc.packing") : null,
    state.parkingZone ? t("calc.parkingZone") : null,
    state.transportInsurance ? t("calc.insurance") : null,
  ].filter((entry): entry is string => entry !== null);

  const handled =
    Object.values(state.assemblyItems).reduce((sum, count) => sum + count, 0) +
    Object.values(state.disassemblyItems).reduce((sum, count) => sum + count, 0);

  const itemCount = Object.values(state.selectedItems).reduce((sum, count) => sum + count, 0);

  const none = t("calc.summaryNone");

  const value: Record<StepId, string> = {
    service: t(`calc.service.${state.serviceType}Name`),
    route: [
      t(`calc.customer.${state.customerType}`),
      state.originAddress,
      state.serviceType === "moving" ? state.destinationAddress : "",
    ]
      .filter(Boolean)
      .join(" · "),
    property: [
      floor(state.originFloor, state.originHasElevator),
      state.serviceType === "moving"
        ? floor(state.destinationFloor, state.destinationHasElevator)
        : "",
    ]
      .filter(Boolean)
      .join(" → "),
    volume:
      state.calculationMethod === "area"
        ? t("calc.sqmValue", { values: { n: state.areaSqm || "0" } })
        : t("calc.totalItemsAll", { values: { count: itemCount } }),
    addons: addons.length > 0 ? addons.join(" · ") : none,
    workers: `${state.crewSize === 3 ? t("calc.crewThree") : t("calc.crewTwo")}${
      state.secondVan ? ` · ${t("calc.secondVan")}` : ""
    }`,
    special: handled > 0 ? t("calc.totalItemsAll", { values: { count: handled } }) : none,
    photos:
      state.photoNames.length > 0
        ? t("calc.totalItemsAll", { values: { count: state.photoNames.length } })
        : none,
    date: state.scheduledDate
      ? `${formatDate(state.scheduledDate)} · ${t(`calc.window.${WINDOW_KEY[
          (ARRIVAL_WINDOWS.find((entry) => entry === state.scheduledTime) ?? "08:00") as ArrivalWindow
        ]}`)}`
      : none,
    review: "",
  };

  return (
    <dl className={`${card} divide-y divide-border-subtle`}>
      {activeSteps(state)
        .filter((step) => step.id !== "review")
        .map((step) => (
          <div
            key={step.id}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
          >
            <dt className="text-body-sm font-semibold text-text-default">{t(step.railKey)}</dt>
            <dd className="text-body-sm text-text-strong">{value[step.id]}</dd>
          </div>
        ))}
    </dl>
  );
}

export const STEP_COMPONENTS: Record<StepId, (props: StepProps) => JSX.Element> = {
  service: ServiceStep,
  route: RouteStep,
  property: PropertyStep,
  volume: VolumeStep,
  addons: AddonsStep,
  workers: WorkersStep,
  special: SpecialStep,
  photos: PhotosStep,
  date: DateStep,
  review: ReviewStep,
};
