"use client";

import {
  can as roleCan,
  isStaffRole,
  ROLE_RANK,
  type Permission,
} from "@mon/core";
import {
  ApiError,
  createBrowserTokenStore,
  createSdk,
  type AuthUser,
  type MonSdk,
} from "@mon/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { HINT_COOKIE } from "./access/cookies";

/**
 * The single point at which this app talks to the backend.
 *
 * There are deliberately no Next.js route handlers here: components use the
 * typed SDK, which calls the Express API directly. Nothing in this app imports
 * a database client, and no page computes a price — both of which the previous
 * version did throughout.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Set while a sign-out has been asked for but not confirmed by the API.
 *
 * Only the API can clear the refresh cookie, so a logout that never arrives
 * leaves a live session that the next page load silently resumes — the user
 * pressed "sign out" and came back signed in. The intent is remembered here
 * and carried out before any session is restored.
 */
const PENDING_SIGN_OUT_KEY = "mon.signout-pending";

function rememberPendingSignOut(pending: boolean): void {
  try {
    if (pending) globalThis.localStorage?.setItem(PENDING_SIGN_OUT_KEY, "1");
    else globalThis.localStorage?.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {
    // Private mode, or a browser blocking site data. The sign-out still
    // happens; only the ability to finish it after a reload is lost.
  }
}

function hasPendingSignOut(): boolean {
  try {
    return globalThis.localStorage?.getItem(PENDING_SIGN_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Ends the session on the server, which is the only place it can be ended.
 *
 * Two attempts, because the failure this exists for is a dropped connection
 * rather than a refusal — the endpoint accepts an unauthenticated call and
 * clears the cookies regardless of what it finds.
 */
async function endServerSession(sdk: MonSdk): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await sdk.auth.logout();
      rememberPendingSignOut(false);
      return true;
    } catch {
      // Retried once, then left to the pending flag above.
    }
  }

  return false;
}

/**
 * Drops the session hint from this browser.
 *
 * The hint is not httpOnly precisely so this is possible. When a sign-out
 * cannot reach the API the refresh cookie survives — nothing here can touch
 * it — but the hint is what the edge middleware routes on, and a browser that
 * keeps being sent into /admin after the user asked to leave is the part they
 * can see. Deleting a cookie means matching the attributes it was set with,
 * and the hint carries a parent domain in production, so each candidate is
 * tried.
 */
function dropSessionHint(): void {
  if (typeof document === "undefined") return;

  const { hostname } = window.location;
  const parent = hostname.split(".").slice(-2).join(".");

  for (const domain of [null, hostname, `.${parent}`]) {
    document.cookie = `${HINT_COOKIE}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
  }
}

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check has finished. */
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const SIGNED_OUT: AuthState = {
  user: null,
  loading: false,
  isAdmin: false,
  isStaff: false,
};

interface ApiContextValue extends AuthState {
  sdk: MonSdk;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  /**
   * Signs in with a one-time code emailed to the address.
   *
   * Separate from `signIn` because the credential is different, but it must
   * store the token pair exactly as `signIn` does — a page that called
   * `sdk.auth.verifyOtp` itself would get a valid session from the API and then
   * fail on the next request, because nothing put the access token where the
   * client reads it.
   */
  signInWithCode: (email: string, code: string) => Promise<AuthUser>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    locale?: string;
    quoteId?: string;
  }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /**
   * Whether the signed-in user holds a capability, answered from the same
   * table the API enforces against.
   *
   * This is for *rendering*: hide a control nobody can use, rather than show
   * one that returns 403. It decides nothing. Every endpoint behind these
   * screens re-reads the role from the database and checks the capability
   * itself, so a user who forces this to return true gains a button and
   * nothing else.
   */
  can: (permission: Permission) => boolean;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
    isStaff: false,
  });

  // The token store and SDK are created once. Recreating them per render would
  // discard the in-memory access token on every state change.
  const tokensRef = useRef(createBrowserTokenStore());

  const sdk = useMemo(
    () =>
      createSdk({
        baseUrl: API_URL,
        tokens: tokensRef.current,
        onSessionExpired: () => setState(SIGNED_OUT),
      }),
    [],
  );

  const applyUser = useCallback((user: AuthUser | null) => {
    if (!user) {
      setState(SIGNED_OUT);
      return;
    }

    setState({
      user,
      loading: false,
      // Derived from rank, not from a list of role names: a role added above
      // admin (super_admin was exactly that) is included without this line
      // being revisited, which is how the old literal check went stale.
      isAdmin: ROLE_RANK[user.role] >= ROLE_RANK.admin,
      isStaff: isStaffRole(user.role),
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await sdk.auth.me();
      applyUser(user);
    } catch (error) {
      // An expired or absent session is the normal anonymous case, not a bug.
      if (error instanceof ApiError && error.isAuthFailure) {
        applyUser(null);
        return;
      }

      applyUser(null);
    }
  }, [sdk, applyUser]);

  // Restore the session on mount. The SDK refreshes the access token from the
  // stored refresh token transparently, so a reload keeps the user signed in.
  useEffect(() => {
    void (async () => {
      // Unless a sign-out is still owed. Finishing it here is what stops a
      // failed logout from being undone by a page reload: the refresh cookie
      // outlives the browser's own state, so restoring first would hand back
      // the session the user asked to end.
      if (hasPendingSignOut() && !(await endServerSession(sdk))) {
        applyUser(null);
        return;
      }

      await refreshUser();
    })();
  }, [sdk, refreshUser, applyUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await sdk.auth.login({ email, password });

      tokensRef.current.set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      applyUser(result.user);

      return result.user;
    },
    [sdk, applyUser],
  );

  const signInWithCode = useCallback(
    async (email: string, code: string) => {
      const result = await sdk.auth.verifyOtp({ email, code });

      tokensRef.current.set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      applyUser(result.user);

      return result.user;
    },
    [sdk, applyUser],
  );

  const signUp = useCallback<ApiContextValue["signUp"]>(
    async (input) => {
      const result = await sdk.auth.register(input);

      tokensRef.current.set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      applyUser(result.user);

      return result.user;
    },
    [sdk, applyUser],
  );

  const signOut = useCallback(async () => {
    // Always called, with no token to pass: the refresh token is an httpOnly
    // cookie, so this code can neither read it nor delete it — only the API
    // can. Skipping the call would leave the cookie in place and the next page
    // load would quietly restore the session.
    //
    // The intent is written down before the attempt, so a failure is finished
    // on the next mount rather than forgotten. It used to be swallowed
    // outright: local state was cleared, the user was told they were signed
    // out, and both cookies stayed live for as long as they lasted.
    rememberPendingSignOut(true);

    if (!(await endServerSession(sdk))) {
      // The server session survives and nothing here can end it. What this can
      // do is stop the browser behaving as though it were still signed in.
      dropSessionHint();
    }

    // Cleared either way. The user asked to be out.
    tokensRef.current.clear();
    applyUser(null);
  }, [sdk, applyUser]);

  const role = state.user?.role;

  // Depends on the role alone, so a screen that asks about a capability does
  // not re-render every time some other part of the session changes.
  const can = useCallback(
    (permission: Permission) => (role ? roleCan(role, permission) : false),
    [role],
  );

  const value = useMemo<ApiContextValue>(
    () => ({ ...state, sdk, signIn, signInWithCode, signUp, signOut, refreshUser, can }),
    [state, sdk, signIn, signInWithCode, signUp, signOut, refreshUser, can],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error("useApi must be used inside <ApiProvider>.");
  }

  return context;
}

/**
 * Convenience: one capability, for a screen that only needs to ask about one.
 *
 * `const mayPrice = useCan("pricing.write");`
 */
export function useCan(permission: Permission): boolean {
  return useApi().can(permission);
}

/** Convenience: the SDK on its own, for components that do not need auth state. */
export function useSdk(): MonSdk {
  return useApi().sdk;
}

export { ApiError };

