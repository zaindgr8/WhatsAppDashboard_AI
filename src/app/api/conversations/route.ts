import { NextResponse, after } from "next/server";
import { listConversations } from "@/lib/store";
import { seedDemoIfEmpty } from "@/lib/demo";
import { sessionOpen } from "@/lib/twilio";
import { backfillLeads } from "@/lib/leads";
import { syncFromTwilio } from "@/lib/poller";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDemoIfEmpty();
  // Pull new messages (e.g. n8n replies) from Twilio after responding; they show up on the next refresh.
  after(syncFromTwilio);
  after(() => backfillLeads().catch((err) => console.error("[leads]", err)));
  const conversations = await listConversations();
  return NextResponse.json(conversations.map((c) => ({ ...c, sessionOpen: sessionOpen(c.lastInboundAt) })));
}
