// Demo-only authentication.
// The credentials are read from Vite env variables at build time, so they are
// visible to anyone who inspects the deployed JavaScript. Do not use this for
// real or sensitive data.

const AUTH_KEY = "vod-demo-auth";

const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

export function isConfigured(): boolean {
  return Boolean(DEMO_USERNAME && DEMO_PASSWORD);
}

export function login(username: string, password: string): boolean {
  if (!isConfigured()) return false;
  if (username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD) {
    try {
      sessionStorage.setItem(AUTH_KEY, "1");
    } catch {
      // Storage unavailable: login still applies for this page view only.
    }
    return true;
  }
  return false;
}

export function logout(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}
