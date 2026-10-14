// Shared by middleware (edge) and route handlers.
export const SESSION_COOKIE = "wa_session";

// Hardcoded fallback credentials as requested
export const HARDCODED_USERNAME = "aifounderhub";
export const HARDCODED_PASSWORD = "Wegrowtogether@yo1";

export function getExpectedCredentials() {
  const username = (process.env.DASHBOARD_USERNAME || HARDCODED_USERNAME).trim();
  const password = process.env.DASHBOARD_PASSWORD || HARDCODED_PASSWORD;
  return { username, password };
}

export async function sessionToken(username: string, password: string) {
  const data = new TextEncoder().encode(`wa-dashboard:${username.toLowerCase()}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
