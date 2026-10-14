import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken, getExpectedCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password } = getExpectedCredentials();

    const inputUser = (body.username || "").trim().toLowerCase();
    const inputPass = body.password || "";

    const expectedUser = username.trim().toLowerCase();
    const expectedPass = password;

    if (inputUser !== expectedUser || inputPass !== expectedPass) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    const token = await sessionToken(username, password);

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
