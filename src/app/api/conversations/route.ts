import { NextResponse } from "next/server";
import { listConversations } from "@/lib/store";
import { seedDemoIfEmpty } from "@/lib/demo";
import { sessionOpen } from "@/lib/twilio";
import { backfillLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function GET() {
  seedDemoIfEmpty();
  backfillLeads();
  return NextResponse.json(listConversations().map((c) => ({ ...c, sessionOpen: sessionOpen(c.lastInboundAt) })));
}
