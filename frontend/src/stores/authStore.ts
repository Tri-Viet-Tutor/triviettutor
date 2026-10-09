import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AUTH_STORAGE_KEY } from "@/constants/storage";
import type { UserInfo } from "@/types/api";

/** The `user` object of the backend's AuthResponse (id, email, fullName, role). */
export type AuthUser = UserInfo;

interface AuthState {
  /** JWT access token — null when logged out */
  token: string | null;
  /** User info from the login / register response (AuthResponse.user) */
  user: AuthUser | null;
  /** Store the JWT (AuthResponse.accessToken) and user info after login or registration */
  setAuth: (token: string, user: AuthUser) => void;
  /** Clear session (logout or 401) */
  logout: () => void;
  /** True when a valid token is present */
  isAuthenticated: boolean;
}

/**
 * Global authentication state store (Zustand).
 *
 * Uses `persist` middleware to survive page refreshes via localStorage.
 * For production consider switching token storage to an httpOnly cookie.
 *
 * Selectors — prefer accessing only what you need:
 *   const user = useAuthStore(s => s.user);
 *   const isAuthenticated = useAuthStore(s => s.isAuthenticated);
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({     // Only persist token + user, not functions
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
