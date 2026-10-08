import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Optional language-model answers for the wedding assistant.
 *
 * Off unless ANTHROPIC_API_KEY is set on the server. The browser sends only
 * the aggregate facts from `assistantContext()` (no guest names or contacts).
 * In cloud mode the caller must be signed in.
 */

const MODEL = "claude-opus-5-5";
const MAX_CONTEXT_CHARS = 60_000;

const SYSTEM = `You are the wedding assistant inside Wedding OS, a planning and wedding-investment app for Sri Lankan couples.
Answer the couple's question using only the JSON facts provided about their wedding. All money is Sri Lankan rupees: write it as "LKR 1,250,000" (code first, comma grouping, whole rupees) and round estimates to the nearest LKR 5,000.
Voice: warm, calm, certain; speak to the couple as "you"; never say "I". Be concise: a short direct answer first, then at most four bullet points, then one suggested next step. No emoji.
Money is intentional, never cheap: never recommend "the cheapest" option for its own sake and never talk about ROI or profit; protect the experiences they listed as must-haves, and look for savings first where they said they don't want to overspend.
Use Sri Lankan wedding terms plainly and correctly (Poruwa, nekath, going-away, National Suit).
If the facts don't contain what's needed, say what's missing and where in the app to add it. Never invent vendors, prices, dates or guests.`;

const bodySchema = z.object({
  question: z.string().trim().min(2).max(500),
  context: z.record(z.string(), z.unknown()),
});

// Best-effort per-instance limiter: 20 questions per 10 minutes per caller.
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 20;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function caller(req: Request): Promise<{ ok: true; key: string } | { ok: false; status: number; error: string }> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!supabaseUrl || !supabaseKey) return { ok: true, key: ip };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Sign in to use the assistant." };
  const { data, error } = await createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }).auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Your session has expired. Sign in again." };
  return { ok: true, key: data.user.id };
}

export async function GET() {
  return Response.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "The assistant's deeper answers aren't set up on this server." }, { status: 501 });

  const who = await caller(req);
  if (!who.ok) return Response.json({ error: who.error }, { status: who.status });
  if (limited(who.key)) return Response.json({ error: "That's a lot of questions at once. Try again in a few minutes." }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question between 2 and 500 characters." }, { status: 400 });
  const facts = JSON.stringify(parsed.data.context);
  if (facts.length > MAX_CONTEXT_CHARS) return Response.json({ error: "Your wedding data is too large to send in one question." }, { status: 413 });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" }, // conversational Q&A; latency matters more than depth
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `<wedding_facts>\n${facts}\n</wedding_facts>\n\nQuestion: ${parsed.data.question}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ answer: "That's not something the assistant can help with. Try asking about your budget, guests, vendors or timeline." });
    }
    const answer = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return Response.json({ answer: answer || "There's no answer for that yet — try rephrasing the question." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "The assistant is busy. Try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "The assistant's API key is invalid." }, { status: 502 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "The assistant couldn't answer right now." }, { status: 502 });
    return Response.json({ error: "The assistant couldn't answer right now." }, { status: 500 });
  }
}
