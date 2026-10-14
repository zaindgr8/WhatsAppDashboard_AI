import { NextResponse } from "next/server";
import { getConversation, getMessages, updateConversation } from "@/lib/store";
import { sessionOpen } from "@/lib/twilio";
import type { Conversation } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const id = decodeURIComponent((await params).id);
  const c = getConversation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ conversation: { ...c, sessionOpen: sessionOpen(c.lastInboundAt) }, messages: getMessages(id) });
}

const EDITABLE = ["name", "aiEnabled", "needsHuman", "status", "tags", "notes", "unread"] as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const id = decodeURIComponent((await params).id);
  const body = (await req.json()) as Partial<Conversation>;
  const patch: Partial<Conversation> = {};
  for (const k of EDITABLE) if (k in body) (patch as Record<string, unknown>)[k] = body[k];
  // Turning AI back on clears the "needs human" flag.
  if (patch.aiEnabled === true) Object.assign(patch, { needsHuman: false, handoffReason: undefined });
  const c = updateConversation(id, patch);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}
