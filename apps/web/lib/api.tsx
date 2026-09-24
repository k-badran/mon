"use client";

import {
  can as roleCan,
  isStaffRole,
  ROLE_RANK,
  type Permission,
} from "@umzugplus/core";
import {
  ApiError,
  createBrowserTokenStore,
  createSdk,
  type AuthUser,
  type UmzugPlusSdk,
} from "@umzugplus/client";
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

/**
 * The single point at which this app talks to the backend.
 *
 * There are deliberately no Next.js route handlers here: components use the
 * typed SDK, which calls the Express API directly. Nothing in this app imports
 * a database client, and no page computes a price — both of which the previous
 * version did throughout.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  sdk: UmzugPlusSdk;
  signIn: (email: string, password: string) => Promise<AuthUser>;
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
    void refreshUser();
  }, [refreshUser]);

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
    // cookie now, so this code can neither read it nor delete it — only the
    // API can. Skipping the call would leave the cookie in place and the next
    // page load would quietly restore the session.
    //
    // Local state is cleared either way. The user asked to be out.
    await sdk.auth.logout().catch(() => undefined);

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
    () => ({ ...state, sdk, signIn, signUp, signOut, refreshUser, can }),
    [state, sdk, signIn, signUp, signOut, refreshUser, can],
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
export function useSdk(): UmzugPlusSdk {
  return useApi().sdk;
}

export { ApiError };

