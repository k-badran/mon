import type { QuoteInput } from "@mon/core";

/**
 * The calculator's state machine.
 *
 * The flow is ten steps in the design, and the previous implementation held it
 * as twenty `useState` calls inside one 433-line component. That made two
 * things impossible: reading which answers a step actually needs, and putting
 * the step in the URL so a half-finished quote survives a refresh or a shared
 * link.
 *
 * So the answers live in one object, transitions go through one reducer, and
 * every step declares its own `applies` and `complete` predicates. The wizard
 * shell never asks "which step is this?" — it asks the step.
 */

export type StepId =
  | "service"
  | "route"
  | "property"
  | "volume"
  | "addons"
  | "workers"
  | "special"
  | "photos"
  | "date"
  | "review";

export interface CalculatorState {
  serviceType: QuoteInput["serviceType"];
  customerType: QuoteInput["customerType"];

  originAddress: string;
  destinationAddress: string;
  originFloor: number;
  destinationFloor: number;
  originHasElevator: boolean;
  destinationHasElevator: boolean;

  calculationMethod: QuoteInput["calculationMethod"];
  areaSqm: string;
  selectedItems: Record<string, number>;

  packingService: boolean;
  parkingZone: boolean;
  transportInsurance: boolean;

  crewSize: 2 | 3;
  secondVan: boolean;

  assemblyItems: Record<string, number>;
  disassemblyItems: Record<string, number>;

  /**
   * Local previews only.
   *
   * There is no upload endpoint yet, so these never leave the browser. The
   * step says so rather than pretending the files were received — a customer
   * who believes they have sent photos of a piano and has not is a dispute on
   * moving day.
   */
  photoNames: string[];

  scheduledDate: string;
  scheduledTime: string;
  discountCode: string;
}

export const INITIAL_STATE: CalculatorState = {
  serviceType: "moving",
  customerType: "private",

  originAddress: "",
  destinationAddress: "",
  originFloor: 0,
  destinationFloor: 0,
  originHasElevator: false,
  destinationHasElevator: false,

  calculationMethod: "area",
  areaSqm: "",
  selectedItems: {},

  packingService: false,
  parkingZone: false,
  transportInsurance: false,

  crewSize: 2,
  secondVan: false,

  assemblyItems: {},
  disassemblyItems: {},

  photoNames: [],

  scheduledDate: "",
  // The start of the morning arrival window; the date step offers three.
  scheduledTime: "08:00",
  discountCode: "",
};

export type CalculatorAction =
  | { type: "set"; patch: Partial<CalculatorState> }
  | { type: "setItemQuantity"; bucket: ItemBucket; itemId: string; quantity: number }
  | { type: "reset" };

type ItemBucket = "selectedItems" | "assemblyItems" | "disassemblyItems";

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };

    case "setItemQuantity": {
      const next = { ...state[action.bucket] };

      // A zero is a removal, not a stored zero: the pricing engine iterates
      // these maps, and an entry of 0 is a line item worth nothing.
      if (action.quantity > 0) next[action.itemId] = action.quantity;
      else delete next[action.itemId];

      return { ...state, [action.bucket]: next };
    }

    case "reset":
      return INITIAL_STATE;
  }
}

interface StepDefinition {
  id: StepId;
  /** Translation key for the step's own heading, as the design writes it. */
  labelKey: string;
  /**
   * The short name in the progress rail. The heading is a sentence
   * ("Customer type & Route details"); the rail has 132px per segment.
   */
  railKey: string;
  /** The line under the heading that says what the step is for. */
  leadKey: string;
  /**
   * Whether this step is part of the flow given the answers so far. A disposal
   * job has no destination, and a cleaning job has no crew to size.
   */
  applies: (state: CalculatorState) => boolean;
  /** Whether the customer may move past it. */
  complete: (state: CalculatorState) => boolean;
  /** Steps a customer may pass without answering. */
  optional?: boolean;
}

/** Moving is the only service with two addresses and a van to fill. */
const isMoving = (state: CalculatorState) => state.serviceType === "moving";

/**
 * The ten steps, in the order the design numbers them.
 *
 * The design file carries two progress chromes that disagree. The five-node
 * rail on the first screens names Services · Addresses · Properties · Volume
 * Estimate · Final Review; the ten-segment rail on the later screens counts
 * "Step 5 of 10" on the add-ons screen, "Step 6 of 10" on workers, and so on
 * up to a tenth segment called Review.
 *
 * The two only reconcile one way: customer type and the addresses are a single
 * screen ("Customer type & Route details"), the two volume screens are one step
 * in two modes, and a Review step closes the flow. Counting that way puts
 * add-ons at 5 and date at 9 exactly as the later screens claim, so that is the
 * structure here.
 *
 * The rail labels come from the five-node rail for the first four steps,
 * because the ten-segment one labels them Contact/Route/Inventory/Options —
 * names that do not describe what those screens ask for.
 */
export const STEPS: StepDefinition[] = [
  {
    id: "service",
    labelKey: "calc.step.service",
    railKey: "calc.rail.service",
    leadKey: "calc.lead.service",
    applies: () => true,
    complete: (s) => Boolean(s.serviceType),
  },
  {
    id: "route",
    labelKey: "calc.step.route",
    railKey: "calc.rail.route",
    leadKey: "calc.lead.route",
    applies: () => true,
    complete: (s) =>
      Boolean(s.customerType) &&
      s.originAddress.trim().length > 3 &&
      (!isMoving(s) || s.destinationAddress.trim().length > 3),
  },
  {
    id: "property",
    labelKey: "calc.step.property",
    railKey: "calc.rail.property",
    leadKey: "calc.lead.property",
    applies: () => true,
    // Floors default to 0, which is a real answer (ground floor).
    complete: () => true,
  },
  {
    id: "volume",
    labelKey: "calc.step.volume",
    railKey: "calc.rail.volume",
    leadKey: "calc.lead.volume",
    applies: () => true,
    complete: (s) =>
      s.calculationMethod === "area"
        ? Number.parseFloat(s.areaSqm) > 0
        : Object.keys(s.selectedItems).length > 0,
  },
  {
    id: "addons",
    labelKey: "calc.step.addons",
    railKey: "calc.rail.addons",
    leadKey: "calc.lead.addons",
    applies: () => true,
    complete: () => true,
    optional: true,
  },
  {
    id: "workers",
    labelKey: "calc.step.workers",
    railKey: "calc.rail.workers",
    leadKey: "calc.lead.workers",
    applies: isMoving,
    complete: () => true,
  },
  {
    id: "special",
    labelKey: "calc.step.special",
    railKey: "calc.rail.special",
    leadKey: "calc.lead.special",
    applies: isMoving,
    complete: () => true,
    optional: true,
  },
  {
    id: "photos",
    labelKey: "calc.step.photos",
    railKey: "calc.rail.photos",
    leadKey: "calc.lead.photos",
    applies: () => true,
    complete: () => true,
    optional: true,
  },
  {
    id: "date",
    labelKey: "calc.step.date",
    railKey: "calc.rail.date",
    leadKey: "calc.lead.date",
    applies: () => true,
    complete: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s.scheduledDate),
  },
  {
    /**
     * The tenth segment both rails promise and neither draws.
     *
     * It reads the answers back and hands over to the server for the price —
     * the only screen in the flow that asks for nothing.
     */
    id: "review",
    labelKey: "calc.step.review",
    railKey: "calc.rail.review",
    leadKey: "calc.lead.review",
    applies: () => true,
    complete: () => true,
  },
];

/** The steps that apply to the answers given so far, in order. */
export function activeSteps(state: CalculatorState): StepDefinition[] {
  return STEPS.filter((step) => step.applies(state));
}

export function stepIndex(state: CalculatorState, id: StepId): number {
  return activeSteps(state).findIndex((step) => step.id === id);
}

/**
 * The furthest step the customer may jump to.
 *
 * Progress is earned rather than remembered: the first incomplete step is the
 * boundary. That keeps a back-navigation followed by an edit from leaving a
 * later step reachable on stale answers.
 */
export function furthestReachable(state: CalculatorState): number {
  const steps = activeSteps(state);

  for (let i = 0; i < steps.length; i += 1) {
    if (!steps[i]!.complete(state)) return i;
  }

  return steps.length - 1;
}

/**
 * Builds the payload the API expects.
 *
 * Every field the server does not accept is dropped here rather than being
 * sent and ignored, so a mismatch shows up as a type error at build time.
 */
export function toQuoteInput(state: CalculatorState): QuoteInput {
  const moving = isMoving(state);

  return {
    serviceType: state.serviceType,
    customerType: state.customerType,

    originAddress: state.originAddress.trim(),
    ...(moving && state.destinationAddress.trim()
      ? { destinationAddress: state.destinationAddress.trim() }
      : {}),

    originFloor: state.originFloor,
    destinationFloor: moving ? state.destinationFloor : 0,
    originHasElevator: state.originHasElevator,
    destinationHasElevator: moving ? state.destinationHasElevator : false,

    calculationMethod: state.calculationMethod,
    ...(state.calculationMethod === "area"
      ? { areaSqm: Number.parseFloat(state.areaSqm) || 0 }
      : { selectedItems: state.selectedItems }),

    extras: {
      packingService: state.packingService,
      parkingZone: state.parkingZone,
      transportInsurance: state.transportInsurance,
      ...(Object.keys(state.assemblyItems).length > 0
        ? { assemblyItems: state.assemblyItems }
        : {}),
      ...(Object.keys(state.disassemblyItems).length > 0
        ? { disassemblyItems: state.disassemblyItems }
        : {}),
    },

    crewSize: moving ? state.crewSize : 2,
    secondVan: moving ? state.secondVan : false,

    ...(state.scheduledDate ? { scheduledDate: state.scheduledDate } : {}),
    ...(state.discountCode.trim() ? { discountCode: state.discountCode.trim() } : {}),
  };
}

/**
 * Whether the answers are complete enough to price.
 *
 * Pricing runs on every change, so this guards the request rather than the
 * navigation — an empty area would otherwise send a request per keystroke that
 * the server can only reject.
 */
export function isPriceable(state: CalculatorState): boolean {
  const volume = STEPS.find((step) => step.id === "volume")!;
  return volume.complete(state) && state.originAddress.trim().length > 3;
}
