import { guideToMarkdown } from "@/lib/markdown";
import { getGuide } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/guides/:slug            -> guide JSON
// GET /api/guides/:slug?format=md  -> Markdown (for sharing, tickets, or an agent's context)
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return Response.json({ error: "Guide not found" }, { status: 404 });
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "md") {
    return new Response(guideToMarkdown(guide, `${url.origin}/guides/${slug}`), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `inline; filename="${slug}-oauth-guide.md"`,
      },
    });
  }
  return Response.json(guide);
}
