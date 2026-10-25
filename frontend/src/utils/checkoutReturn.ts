import { ROUTES } from "@/constants/routes";

const STORAGE_KEY = "tuition-login-return";

/** Only checkout/wallet paths may survive login; never accept an external redirect. */
export function checkoutReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 16000 || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      ![ROUTES.checkout, ROUTES.studentCheckout, ROUTES.studentWallet].some((path) => path === url.pathname)
    )
      return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function saveCheckoutReturn(value: string): void {
  const path = checkoutReturnPath(value);
  if (!path) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Router state still supports login when browser storage is unavailable.
  }
}

export function consumeCheckoutReturn(): string | null {
  try {
    const path = checkoutReturnPath(sessionStorage.getItem(STORAGE_KEY));
    sessionStorage.removeItem(STORAGE_KEY);
    return path;
  } catch {
    return null;
  }
}
