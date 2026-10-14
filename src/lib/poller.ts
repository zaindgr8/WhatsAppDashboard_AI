import "server-only";
import { db } from "./store";
import { importHistory, twilioConfigured } from "./twilio";

// Messages your n8n workflow sends go straight through Twilio, so the dashboard
// checks Twilio regularly to show them (and their delivery status) in the chats.
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 15_000);
const LOOKBACK_MS = 30 * 60_000;

const g = globalThis as typeof globalThis & { __waPoller?: NodeJS.Timeout; __waPolling?: boolean };

export function startPoller() {
  if (!twilioConfigured || INTERVAL_MS <= 0 || g.__waPoller) return;
  const tick = async () => {
    if (g.__waPolling) return;
    g.__waPolling = true;
    try {
      // First run on an empty dashboard: bring in the full history.
      if (!Object.keys(db().conversations).length) await importHistory(1000);
      else await importHistory(100, new Date(Date.now() - LOOKBACK_MS));
    } catch (err) {
      console.error("[sync]", err instanceof Error ? err.message : err);
    } finally {
      g.__waPolling = false;
    }
  };
  g.__waPoller = setInterval(tick, INTERVAL_MS);
  void tick();
  console.log(`[sync] Checking Twilio for new WhatsApp messages every ${INTERVAL_MS / 1000}s`);
}
