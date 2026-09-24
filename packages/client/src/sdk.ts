import type { DayAvailability, PriceBreakdown, QuoteInput, Role } from "@umzugplus/core";

import { ApiClient, type ApiClientOptions } from "./http.js";

/**
 * The typed SDK.
 *
 * One method per API operation, grouped by domain. The frontend imports this
 * and calls the backend directly — `sdk.orders.list({ status: "confirmed" })`
 * rather than a hand-written `fetch("/api/orders?...")` in a component, and
 * with no Next.js route handler in between.
 *
 * Request and response types come from `@umzugplus/core`, so the same
 * definitions that the pricing engine uses are what the UI compiles against.
 * A change to `QuoteInput` breaks the frontend build instead of failing at
 * runtime in production.
 */

/**
 * Kept as an alias of the shared `Role` rather than a second list. The union
 * spelled out here had drifted — it still named `staff`, a role the database
 * no longer has — and a frontend that branches on a role the server can never
 * return is branching on nothing.
 */
export type UserRole = Role;
export type OrderStatus = "quoted" | "confirmed" | "cancelled" | "completed";
export type ServiceType = "moving" | "disposal" | "cleaning";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  locale: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface QuoteResult {
  id: string;
  breakdown: PriceBreakdown;
  expiresAt: string;
}

export interface OrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: ServiceType;
  contactName: string;
  contactEmail: string;
  scheduledDate: string | null;
  totalGross: string;
  paidAmount: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  /** Pass back as `cursor` to fetch the next page. Absent on the last page. */
  nextCursor?: string;
}

export interface ListOrdersQuery {
  status?: OrderStatus;
  search?: string;
  limit?: number;
  cursor?: string;
}

export type UserStatus = "active" | "blocked";

/** A user as the administration screens see them. Never includes the hash. */
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ListUsersQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  locale?: string;
  /** Omit to have the server generate one and return it once. */
  password?: string;
}

export interface CreateUserResult {
  user: ManagedUser;
  /**
   * Present only when the server generated it. Shown once and never
   * retrievable again — it is not stored anywhere in plaintext.
   */
  temporaryPassword?: string;
}

export class UmzugPlusSdk {
  readonly http: ApiClient;

  constructor(options: ApiClientOptions) {
    this.http = new ApiClient(options);
  }

  readonly auth = {
    register: (body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      locale?: string;
      /** Attaches a quote calculated before signup, so nothing is retyped. */
      quoteId?: string;
    }): Promise<AuthResult> => this.http.post("/api/auth/register", body, { anonymous: true }),

    login: (body: { email: string; password: string }): Promise<AuthResult> =>
      this.http.post("/api/auth/login", body, { anonymous: true }),

    /**
     * Ends the session server-side and clears the session cookies.
     *
     * The argument is optional: in the browser the refresh cookie identifies
     * the session and the caller has no token to pass. A client without
     * cookies supplies it explicitly.
     */
    logout: (refreshToken?: string): Promise<void> =>
      this.http.post("/api/auth/logout", refreshToken ? { refreshToken } : {}, {
        anonymous: true,
      }),

    me: (): Promise<{ user: AuthUser }> => this.http.get("/api/auth/me"),

    sessions: (): Promise<{ sessions: Array<{ id: string; userAgent: string | null; createdAt: string }> }> =>
      this.http.get("/api/auth/sessions"),

    changePassword: (body: { currentPassword: string; newPassword: string }): Promise<void> =>
      this.http.post("/api/auth/change-password", body),
  };

  readonly quotes = {
    /**
     * Prices a job. The client sends the job description and receives a
     * breakdown — it never sends a price and never sees the rate card.
     */
    create: (input: QuoteInput): Promise<QuoteResult> =>
      this.http.post("/api/quotes", { input }),

    get: (id: string): Promise<QuoteResult> => this.http.get(`/api/quotes/${id}`),
  };

  readonly orders = {
    create: (body: {
      quoteId: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      scheduledDate: string;
      scheduledTime: string;
      notes?: string;
      locale?: string;
    }): Promise<OrderSummary> => this.http.post("/api/orders", body),

    /** Customers receive only their own orders; the server enforces it. */
    list: (query?: ListOrdersQuery): Promise<Paginated<OrderSummary>> =>
      this.http.get("/api/orders", query as Record<string, string | number | undefined>),

    get: (id: string): Promise<OrderSummary> => this.http.get(`/api/orders/${id}`),

    /** Staff only. Rejected by the state machine if the move is not allowed. */
    changeStatus: (id: string, status: OrderStatus, reason?: string): Promise<OrderSummary> =>
      this.http.patch(`/api/orders/${id}/status`, { status, ...(reason ? { reason } : {}) }),

    cancel: (id: string, reason?: string): Promise<OrderSummary> =>
      this.http.post(`/api/orders/${id}/cancel`, reason ? { reason } : {}),
  };

  /**
   * User administration. Every one of these is capability-checked on the
   * server — `users.read` to list, `users.write` to create or edit, and
   * `roles.write` on top of that for anything that changes what someone may
   * do. The screens hide what the viewer cannot use; the API is what refuses.
   */
  readonly users = {
    list: (query?: ListUsersQuery): Promise<{ items: ManagedUser[] }> =>
      this.http.get("/api/users", query as Record<string, string | number | undefined>),

    create: (body: CreateUserInput): Promise<CreateUserResult> =>
      this.http.post("/api/users", body),

    /** Role and status. Rejected if the target is at or above the caller. */
    update: (
      id: string,
      patch: { role?: UserRole; status?: UserStatus },
    ): Promise<ManagedUser> => this.http.patch(`/api/users/${id}`, patch),
  };

  readonly availability = {
    /**
     * Advisory only — the calendar may be stale by the time the customer
     * books. The authoritative check happens inside the booking transaction,
     * which returns SLOT_TAKEN if the day filled up in the meantime.
     */
    month: (year: number, month: number, capacity = 1): Promise<{
      year: number;
      month: number;
      days: DayAvailability[];
    }> => this.http.get("/api/availability", { year, month, capacity }),

    block: (day: string, reason: string): Promise<void> =>
      this.http.post("/api/availability/blocked", { day, reason }),

    unblock: (day: string): Promise<void> =>
      this.http.delete(`/api/availability/blocked/${day}`),
  };

  readonly health = {
    ready: (): Promise<{ status: string; checks: { database: boolean; cache: boolean } }> =>
      this.http.get("/health/ready"),
  };
}

/** Convenience factory. */
export function createSdk(options: ApiClientOptions): UmzugPlusSdk {
  return new UmzugPlusSdk(options);
}
