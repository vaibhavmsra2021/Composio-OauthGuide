import Anthropic from "@anthropic-ai/sdk";
import { generateGuide, type AgentEvent } from "@/lib/agent";
import { listGuides, matchGuide, saveGenerated } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

// Each run costs real model and search spend, so cap it per client IP.
const RUNS_PER_HOUR = Number(process.env.GENERATE_RUNS_PER_HOUR ?? 6);
const recent = new Map<string, number[]>();

function allow(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= RUNS_PER_HOUR) return false;
  recent.set(ip, [...hits, now]);
  return true;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string; force?: boolean };
  const query = (body.query ?? "").trim();
  if (query.length < 2 || query.length > 200) {
    return Response.json({ error: "Enter an app name or website (2 to 200 characters)." }, { status: 400 });
  }

  const guides = await listGuides();
  const existing = matchGuide(guides, query);
  if (existing && !body.force) return Response.json({ match: existing.slug });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) {
    return Response.json({ error: "Rate limit reached for live generation. Try again later." }, { status: 429 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent | { type: "saved"; slug: string }) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const guide = await generateGuide(query, send, {
          signal: req.signal,
          existingSlugs: guides.map((g) => g.slug),
        });
        if (guide) {
          await saveGenerated(guide);
          send({ type: "saved", slug: guide.slug });
        }
      } catch (err) {
        const text =
          err instanceof Anthropic.AuthenticationError
            ? "The server has no valid Anthropic credentials configured."
            : err instanceof Anthropic.RateLimitError
              ? "The model provider is rate limiting us. Try again in a minute."
              : err instanceof Anthropic.APIError
                ? `Model API error (${err.status}).`
                : (err as Error).message;
        console.error("generate failed", err);
        send({ type: "error", text });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
