import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  /** JWT access token — null when logged out */
  token: string | null;
  /** Decoded user info from the login response */
  user: AuthUser | null;
  /** Store JWT and user info after successful login */
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
      name: "viettritutor-auth",    // localStorage key
      partialize: (state) => ({     // Only persist token + user, not functions
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
