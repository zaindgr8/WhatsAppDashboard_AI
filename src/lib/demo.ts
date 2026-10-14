import "server-only";
import { db, ensureConversation, updateConversation, upsertMessage, logAgentEvent } from "./store";
import { twilioConfigured } from "./twilio";
import type { Author } from "./types";

/** Fill an empty dashboard with sample chats so you can explore it before connecting Twilio. */
export function seedDemoIfEmpty() {
  if (twilioConfigured || process.env.DISABLE_DEMO === "true") return;
  if (Object.keys(db().conversations).length) return;

  const now = Date.now();
  const min = 60_000;
  const chats: { phone: string; name: string; ai: boolean; needsHuman?: boolean; reason?: string; msgs: [Author, string, number][] }[] = [
    {
      phone: "+14155550123", name: "Sarah Johnson", ai: true,
      msgs: [
        ["customer", "Hi! Do you ship to Canada?", 42],
        ["ai", "Hi Sarah! Yes, we ship to Canada 🇨🇦 Delivery usually takes 5–7 business days.", 41],
        ["customer", "Great, and is there a tracking number?", 6],
        ["ai", "Absolutely — you'll get a tracking link by WhatsApp and email as soon as your order ships.", 5],
      ],
    },
    {
      phone: "+447700900456", name: "James Patel", ai: false, needsHuman: true, reason: "Customer asked for a refund on a damaged item.",
      msgs: [
        ["customer", "My order arrived damaged. I want a refund.", 18],
        ["ai", "I'm so sorry about that! I'm connecting you with a member of our team — they'll reply here shortly.", 17],
        ["customer", "Ok, waiting", 3],
      ],
    },
    {
      phone: "+971501234567", name: "", ai: true,
      msgs: [
        ["customer", "مرحبا، ما هي ساعات العمل؟", 190],
        ["ai", "مرحباً! نحن متاحون من الأحد إلى الخميس، من 9 صباحاً حتى 6 مساءً.", 189],
      ],
    },
    {
      phone: "+923001234567", name: "Ali Raza", ai: true,
      msgs: [
        ["customer", "Hello, can I change my delivery address?", 1500],
        ["agent", "Hi Ali, sure — please send the new address and I'll update it.", 1490],
        ["customer", "House 12, Street 4, F-7, Islamabad", 1485],
        ["agent", "Done ✅ Updated!", 1480],
      ],
    },
  ];

  for (const c of chats) {
    const id = `whatsapp:${c.phone}`;
    ensureConversation(id, c.name);
    c.msgs.forEach(([author, body, agoMin], i) => {
      upsertMessage(
        {
          id: `demo_${c.phone}_${i}`,
          conversationId: id,
          direction: author === "customer" ? "inbound" : "outbound",
          author,
          body,
          media: [],
          status: author === "customer" ? "received" : "read",
          createdAt: new Date(now - agoMin * min).toISOString(),
        },
        { countUnread: author === "customer" && agoMin < 20 },
      );
      if (author === "ai") logAgentEvent({ conversationId: id, type: "reply", detail: body, model: "claude-opus-5-5", latencyMs: 1400 + i * 120, inputTokens: 900, outputTokens: 60 });
    });
    updateConversation(id, { aiEnabled: c.ai, needsHuman: !!c.needsHuman, handoffReason: c.reason, status: c.phone.startsWith("+92") ? "resolved" : "open" });
  }
}
