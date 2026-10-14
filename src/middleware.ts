import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

const PUBLIC = ["/login", "/api/auth", "/api/webhooks"];

export async function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next(); // no password set → open (local dev)
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (req.cookies.get(SESSION_COOKIE)?.value === (await sessionToken(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
