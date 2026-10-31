import { listGuides } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const guides = await listGuides();
  return Response.json(
    guides.map((g) => ({
      slug: g.slug,
      name: g.name,
      difficulty: g.verdict.difficulty,
      headline: g.verdict.headline,
      handsOn: g.effort.handsOn,
      approvalWait: g.effort.approvalWait,
      origin: g.meta.origin,
    })),
  );
}
