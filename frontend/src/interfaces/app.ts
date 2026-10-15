import type { ReactNode } from "react";
import type { Role } from "@/interfaces/api";

// ── app/AppProviders.tsx ──
/** Props của AppProviders */
export interface AppProvidersProps {
  children: ReactNode;
}

// ── components/routing ──
/** Props của LegacyRedirect */
export interface LegacyRedirectProps {
  /** Đường dẫn mới */
  to: string;
}

/** Props của RoleRoute */
export interface RoleRouteProps {
  /** Vai trò được phép vào nhóm trang này */
  allowedRole: Role;
}
