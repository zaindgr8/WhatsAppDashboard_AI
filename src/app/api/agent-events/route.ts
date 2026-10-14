import { NextResponse } from "next/server";
import { listAgentEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listAgentEvents(200));
}
