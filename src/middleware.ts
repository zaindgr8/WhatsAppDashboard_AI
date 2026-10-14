import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken, getExpectedCredentials } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/webhooks", "/_next", "/favicon", "/icon", "/apple-icon"];

export async function middleware(req: NextRequest) {
  const { username, password } = getExpectedCredentials();
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const expectedToken = await sessionToken(username, password);
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = sessionCookie === expectedToken;

  if (pathname === "/login") {
    if (isAuthenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isPublic) return NextResponse.next();

  if (isAuthenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"] };
