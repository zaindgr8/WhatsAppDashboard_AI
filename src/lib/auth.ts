// Shared by middleware (edge) and route handlers. The session cookie is a SHA-256 of the dashboard password.
export const SESSION_COOKIE = "wa_session";

export async function sessionToken(password: string) {
  const data = new TextEncoder().encode(`wa-dashboard:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
